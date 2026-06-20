from fastapi import FastAPI, HTTPException, UploadFile, File, Form
import os
import shutil
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
import numpy as np
import json
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, OneHotEncoder, LabelEncoder, PolynomialFeatures
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor
from sklearn.neighbors import KNeighborsRegressor
from sklearn.svm import SVR
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from scipy.stats import shapiro, linregress, ttest_ind

app = FastAPI(
    title="Datax API",
    description="Backend API for Datax (DataLens AI) Platform",
    version="1.0.0",
)

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:3003",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Datax API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    try:
        # Create user directory if it doesn't exist
        user_dir = os.path.join("d:\\datax\\uploads", user_id)
        os.makedirs(user_dir, exist_ok=True)
        
        # Safe filename
        filename = file.filename
        file_path = os.path.join(user_dir, filename)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Parse file to get metadata (rows, columns)
        if filename.endswith(".csv"):
            df = pd.read_csv(file_path)
        elif filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(file_path)
        else:
            return HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel.")
            
        return {
            "message": "File uploaded successfully",
            "file_path": file_path,
            "filename": filename,
            "row_count": len(df),
            "column_count": len(df.columns),
            "columns": df.columns.tolist(),
            "preview_data": df.head(100).replace({np.nan: None}).to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ProfileRequest(BaseModel):
    file_path: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None  # fallback if file_path is not used

class OutlierConfig(BaseModel):
    method: str
    action: str

class CleanConfig(BaseModel):
    missing_values: Dict[str, str] = {}
    outliers: Dict[str, OutlierConfig] = {}

class CleanRequest(BaseModel):
    file_path: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    config: CleanConfig
    save_to_disk: bool = False

def _replace_nans(obj):
    if isinstance(obj, dict):
        return {k: _replace_nans(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_replace_nans(v) for v in obj]
    elif pd.isna(obj) or obj == np.inf or obj == -np.inf:
        return None
    return obj

@app.post("/api/profile")
async def profile_data(request: ProfileRequest):
    try:
        # Load data from file_path if provided, else use data array
        if request.file_path and os.path.exists(request.file_path):
            if request.file_path.endswith(".csv"):
                df = pd.read_csv(request.file_path)
            elif request.file_path.endswith((".xls", ".xlsx")):
                df = pd.read_excel(request.file_path)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
        elif request.data:
            df = pd.DataFrame(request.data)
        else:
            raise HTTPException(status_code=400, detail="Either file_path or data must be provided")
        
        
        # 1. Get Column Data Types
        dtypes = df.dtypes.astype(str).to_dict()
        
        # 2. Get Describe Stats (Numerical & Categorical)
        # Using include='all' might result in NaNs for mixed types, so we handle it cleanly
        describe_df = df.describe(include='all').replace({np.nan: None})
        describe_dict = describe_df.to_dict()
        
        # 3. Get Data Slices (head, tail, center)
        head_data = df.head(50).replace({np.nan: None}).to_dict(orient='records')
        tail_data = df.tail(50).replace({np.nan: None}).to_dict(orient='records')
        
        # Center: middle 50 rows
        if len(df) > 50:
            mid_idx = len(df) // 2
            start_idx = max(0, mid_idx - 25)
            end_idx = min(len(df), mid_idx + 25)
            center_data = df.iloc[start_idx:end_idx].replace({np.nan: None}).to_dict(orient='records')
        else:
            center_data = head_data
            
        # 4. EDA Text/Table Metrics
        
        # NEW FIELD: Memory Usage (in MB)
        memory_usage_mb = float(df.memory_usage(deep=True).sum() / (1024 * 1024))
        
        # NEW FIELD: Unique counts
        unique_counts = {str(k): int(v) for k, v in df.nunique().items()}
        
        # Missing Values
        missing_counts = df.isnull().sum()
        missing_percentages = (missing_counts / len(df)) * 100
        missing_values = {
            str(col): {"count": int(count), "percentage": float(pct)} 
            for col, count, pct in zip(missing_counts.index, missing_counts.values, missing_percentages.values)
        }
        
        # Duplicates
        duplicates_count = int(df.duplicated().sum())
        
        # Value Counts for Categorical Columns (Top 10)
        value_counts = {}
        cat_cols = df.select_dtypes(include=['object', 'category', 'bool']).columns
        for col in cat_cols:
            vc = df[col].value_counts(dropna=False).head(10)
            value_counts[str(col)] = {str(k): int(v) for k, v in vc.items()}
            
        # Outliers for Numerical Columns (IQR Method)
        outliers = {}
        skewness = {}
        kurtosis = {}
        histogram_data = {}
        boxplot_stats = {}
        
        mode_vals = {}
        variance = {}
        iqr_stats = {}
        outlier_percentage = {}
        shapiro_stats = {}
        trend_stats = {}
        data_quality = {}
        
        # Populate for all columns (Mode, Data Quality)
        for col in df.columns:
            m_vals = df[col].mode()
            mode_vals[str(col)] = str(m_vals.iloc[0]) if not m_vals.empty else None
            
            missing_count = missing_counts.get(col, 0)
            u_count = unique_counts.get(str(col), 0)
            total_rows = len(df)
            completeness = ((total_rows - missing_count) / total_rows * 100) if total_rows > 0 else 0
            uniqueness = (u_count / total_rows * 100) if total_rows > 0 else 0
            
            data_quality[str(col)] = {
                "completeness": float(completeness),
                "uniqueness": float(uniqueness),
                "consistency": 100.0,
                "validity": 100.0
            }
        
        num_cols = df.select_dtypes(include=[np.number]).columns
        for col in num_cols:
            col_data = df[col].dropna()
            if len(col_data) == 0:
                continue
                
            Q1 = col_data.quantile(0.25)
            Q3 = col_data.quantile(0.75)
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            outliers_mask = (col_data < lower_bound) | (col_data > upper_bound)
            outlier_cnt = int(outliers_mask.sum())
            outliers[str(col)] = outlier_cnt
            
            variance[str(col)] = float(col_data.var()) if not pd.isna(col_data.var()) else None
            iqr_stats[str(col)] = {
                "iqr": float(IQR),
                "lower_bound": float(lower_bound),
                "upper_bound": float(upper_bound)
            }
            outlier_percentage[str(col)] = float((outlier_cnt / len(col_data)) * 100) if len(col_data) > 0 else 0.0
            
            # Skewness & Kurtosis
            skewness[str(col)] = float(col_data.skew()) if not pd.isna(col_data.skew()) else None
            kurtosis[str(col)] = float(col_data.kurtosis()) if not pd.isna(col_data.kurtosis()) else None
            
            # Shapiro-Wilk (Sample max 5000)
            try:
                sample_data = col_data if len(col_data) <= 5000 else col_data.sample(5000, random_state=42)
                stat, p = shapiro(sample_data)
                shapiro_stats[str(col)] = {"statistic": float(stat), "p_value": float(p)}
            except:
                shapiro_stats[str(col)] = None
                
            # Trend (Linear regression against index)
            try:
                if len(col_data) > 1:
                    slope, intercept, r_value, p_value, std_err = linregress(np.arange(len(col_data)), col_data.values)
                    trend_stats[str(col)] = float(slope)
            except:
                trend_stats[str(col)] = None
            
            # Histogram
            try:
                counts, bins = np.histogram(col_data, bins='auto')
                histogram_data[str(col)] = {
                    "counts": counts.tolist(),
                    "bins": bins.tolist()
                }
            except:
                pass
            
            # Boxplot stats
            try:
                boxplot_stats[str(col)] = {
                    "min": float(col_data.min()),
                    "q1": float(Q1),
                    "median": float(col_data.median()),
                    "q3": float(Q3),
                    "max": float(col_data.max()),
                    "outlier_points": col_data[outliers_mask].head(50).tolist()
                }
            except:
                pass
                
        # Correlation Matrix for Numerical Columns
        correlation_matrix = {}
        spearman_correlation = {}
        if len(num_cols) > 1:
            corr_df = df[num_cols].corr(numeric_only=True).replace({np.nan: None})
            correlation_matrix = corr_df.to_dict()
            
            spearman_df = df[num_cols].corr(method='spearman', numeric_only=True).replace({np.nan: None})
            spearman_correlation = spearman_df.to_dict()
            
        # Smart Alerts
        alerts = []
        
        if duplicates_count > 0:
            alerts.append({"severity": "warning", "message": f"Dataset contains {duplicates_count} duplicate rows."})
            
        for col, mv in missing_values.items():
            if mv["percentage"] > 50:
                alerts.append({"severity": "error", "message": f"Column '{col}' has very high missing values ({mv['percentage']:.1f}%)."})
            elif mv["percentage"] > 10:
                alerts.append({"severity": "warning", "message": f"Column '{col}' has {mv['percentage']:.1f}% missing values."})
                
        for col in cat_cols:
            u_count = unique_counts.get(str(col), 0)
            if u_count > 50 and u_count > len(df) * 0.5:
                alerts.append({"severity": "info", "message": f"Categorical column '{col}' has high cardinality ({u_count} unique values)."})
                
        for col, skew in skewness.items():
            if skew is not None and abs(skew) > 2:
                alerts.append({"severity": "info", "message": f"Numerical column '{col}' is highly skewed (skewness: {skew:.2f})."})
                
        if len(num_cols) > 1:
            for i in range(len(num_cols)):
                for j in range(i+1, len(num_cols)):
                    col1 = str(num_cols[i])
                    col2 = str(num_cols[j])
                    val = correlation_matrix.get(col1, {}).get(col2)
                    if val is not None and abs(val) > 0.8:
                        alerts.append({"severity": "warning", "message": f"Columns '{col1}' and '{col2}' are highly correlated (r={val:.2f})."})

        return {
            "success": True,
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "memory_usage_mb": memory_usage_mb,
            "dtypes": dtypes,
            "describe": _replace_nans(describe_dict),
            "unique_counts": unique_counts,
            "preview": {
                "head": _replace_nans(head_data),
                "center": _replace_nans(center_data),
                "tail": _replace_nans(tail_data)
            },
            "missing_values": missing_values,
            "duplicates": duplicates_count,
            "value_counts": value_counts,
            "outliers": outliers,
            "skewness": _replace_nans(skewness),
            "kurtosis": _replace_nans(kurtosis),
            "histogram_data": _replace_nans(histogram_data),
            "boxplot_stats": _replace_nans(boxplot_stats),
            "correlation": _replace_nans(correlation_matrix),
            "spearman_correlation": _replace_nans(spearman_correlation),
            "alerts": alerts,
            "mode": _replace_nans(mode_vals),
            "variance": _replace_nans(variance),
            "iqr_stats": _replace_nans(iqr_stats),
            "outlier_percentage": _replace_nans(outlier_percentage),
            "shapiro_wilk": _replace_nans(shapiro_stats),
            "trend": _replace_nans(trend_stats),
            "data_quality": _replace_nans(data_quality)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/clean")
async def clean_data(request: CleanRequest):
    try:
        if request.file_path and os.path.exists(request.file_path):
            if request.file_path.endswith(".csv"):
                df = pd.read_csv(request.file_path)
            elif request.file_path.endswith((".xls", ".xlsx")):
                df = pd.read_excel(request.file_path)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
        elif request.data:
            df = pd.DataFrame(request.data)
        else:
            raise HTTPException(status_code=400, detail="Either file_path or data must be provided")
        
        initial_rows = len(df)
        initial_cols = len(df.columns)
        summary = []
        
        # 1. Missing Values
        mv_config = request.config.missing_values
        cols_to_drop = []
        for col, action in mv_config.items():
            if col not in df.columns:
                continue
            
            missing_count = df[col].isnull().sum()
            if missing_count == 0:
                continue
                
            if action == "drop_column":
                cols_to_drop.append(col)
                summary.append(f"Dropped column '{col}' ({missing_count} missing values).")
            elif action == "drop_rows":
                df = df.dropna(subset=[col])
                summary.append(f"Dropped rows with missing values in '{col}'.")
            elif action == "fill_mean" and pd.api.types.is_numeric_dtype(df[col]):
                mean_val = df[col].mean()
                df[col] = df[col].fillna(mean_val)
                summary.append(f"Filled missing values in '{col}' with mean ({mean_val:.2f}).")
            elif action == "fill_median" and pd.api.types.is_numeric_dtype(df[col]):
                median_val = df[col].median()
                df[col] = df[col].fillna(median_val)
                summary.append(f"Filled missing values in '{col}' with median ({median_val:.2f}).")
            elif action == "fill_mode":
                mode_vals = df[col].mode()
                if not mode_vals.empty:
                    mode_val = mode_vals.iloc[0]
                    df[col] = df[col].fillna(mode_val)
                    summary.append(f"Filled missing values in '{col}' with mode ('{mode_val}').")
                    
        if cols_to_drop:
            df = df.drop(columns=cols_to_drop)

        # 2. Outliers
        outlier_config = request.config.outliers
        for col, conf in outlier_config.items():
            if col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
                continue
                
            action = conf.action
            if action == "ignore":
                continue
                
            # Detect Outliers
            outliers_mask = pd.Series(False, index=df.index)
            lower_bound = None
            upper_bound = None
            
            if conf.method == "iqr":
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                outliers_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
            elif conf.method == "zscore":
                mean_val = df[col].mean()
                std_val = df[col].std()
                if std_val > 0:
                    z_scores = (df[col] - mean_val) / std_val
                    outliers_mask = (z_scores > 3) | (z_scores < -3)
                    lower_bound = mean_val - 3 * std_val
                    upper_bound = mean_val + 3 * std_val
            
            outlier_count = outliers_mask.sum()
            if outlier_count == 0:
                continue
                
            if action == "drop_rows":
                df = df[~outliers_mask]
                summary.append(f"Dropped {outlier_count} outlier rows in '{col}' using {conf.method.upper()}.")
            elif action == "cap":
                df[col] = np.where(df[col] < lower_bound, lower_bound, df[col])
                df[col] = np.where(df[col] > upper_bound, upper_bound, df[col])
                summary.append(f"Capped {outlier_count} outliers in '{col}' using {conf.method.upper()}.")

        final_rows = len(df)
        final_cols = len(df.columns)
        
        # Save to disk if requested
        if request.save_to_disk and request.file_path:
            if request.file_path.endswith(".csv"):
                df.to_csv(request.file_path, index=False)
            elif request.file_path.endswith((".xls", ".xlsx")):
                df.to_excel(request.file_path, index=False)
        
        # Clean up NaNs before returning (preview 100 rows only to save bandwidth/memory)
        preview_df = df.head(100)
        cleaned_data = preview_df.replace({np.nan: None}).to_dict(orient='records')
        
        return {
            "success": True,
            "summary": summary,
            "metrics": {
                "initial_rows": initial_rows,
                "final_rows": final_rows,
                "initial_cols": initial_cols,
                "final_cols": final_cols,
                "rows_removed": initial_rows - final_rows,
                "cols_removed": initial_cols - final_cols
            },
            "data": cleaned_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FeatureEngineeringConfig(BaseModel):
    encoding: List[Dict[str, Any]] = []
    scaling: List[Dict[str, Any]] = []
    transformation: List[Dict[str, Any]] = []
    creation: List[Dict[str, Any]] = []

class FeatureEngineeringRequest(BaseModel):
    file_path: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    config: FeatureEngineeringConfig
    save_to_disk: bool = False

@app.post("/api/feature-engineering")
async def feature_engineering(request: FeatureEngineeringRequest):
    try:
        if request.file_path and os.path.exists(request.file_path):
            if request.file_path.endswith(".csv"):
                df = pd.read_csv(request.file_path)
            elif request.file_path.endswith((".xls", ".xlsx")):
                df = pd.read_excel(request.file_path)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
        elif request.data:
            df = pd.DataFrame(request.data)
        else:
            raise HTTPException(status_code=400, detail="Either file_path or data must be provided")
        
        summary = []
        cols_to_drop = []
        
        # 1. Encoding
        for enc in request.config.encoding:
            col = enc.get("column")
            method = enc.get("method")
            drop_original = enc.get("drop_original", False)
            if not col or col not in df.columns:
                continue
            
            if method == "onehot":
                df[col] = df[col].astype(str)
                encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
                encoded_data = encoder.fit_transform(df[[col]])
                col_names = [f"{col}_OHE_{c}" for c in encoder.categories_[0]]
                encoded_df = pd.DataFrame(encoded_data, columns=col_names, index=df.index)
                df = pd.concat([df, encoded_df], axis=1)
                summary.append(f"Applied One-Hot Encoding to '{col}' (added {len(col_names)} columns).")
                if drop_original: cols_to_drop.append(col)
            
            elif method == "label":
                df[col] = df[col].astype(str)
                encoder = LabelEncoder()
                df[f"{col}_LabelEncoded"] = encoder.fit_transform(df[col])
                summary.append(f"Applied Label Encoding to '{col}'.")
                if drop_original: cols_to_drop.append(col)
                
        # 2. Scaling
        for scale in request.config.scaling:
            col = scale.get("column")
            method = scale.get("method")
            drop_original = scale.get("drop_original", False)
            if not col or col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
                continue
            
            mask = df[col].notna()
            if mask.sum() == 0:
                continue
            
            scaler = None
            if method == "standard":
                scaler = StandardScaler()
            elif method == "minmax":
                scaler = MinMaxScaler()
            elif method == "robust":
                scaler = RobustScaler()
            
            if scaler:
                df.loc[mask, f"{col}_{method}_scaled"] = scaler.fit_transform(df.loc[mask, [col]])
                summary.append(f"Applied {str(method).capitalize()} Scaling to '{col}'.")
                if drop_original: cols_to_drop.append(col)

        # 3. Transformation
        for trans in request.config.transformation:
            col = trans.get("column")
            method = trans.get("method")
            drop_original = trans.get("drop_original", False)
            if not col or col not in df.columns or not pd.api.types.is_numeric_dtype(df[col]):
                continue
            
            if method == "log":
                min_val = df[col].min()
                offset = abs(min_val) + 1 if min_val <= 0 else 0
                df[f"{col}_log"] = np.log(df[col] + offset)
                summary.append(f"Applied Log transformation to '{col}'" + (f" (offset +{offset})" if offset > 0 else "") + ".")
                if drop_original: cols_to_drop.append(col)
            elif method == "sqrt":
                min_val = df[col].min()
                offset = abs(min_val) if min_val < 0 else 0
                df[f"{col}_sqrt"] = np.sqrt(df[col] + offset)
                summary.append(f"Applied Sqrt transformation to '{col}'.")
                if drop_original: cols_to_drop.append(col)
            elif method == "binning_equal_width":
                bins = int(trans.get("bins", 5))
                df[f"{col}_binned"] = pd.cut(df[col], bins=bins, labels=False)
                summary.append(f"Applied Equal-Width Binning ({bins} bins) to '{col}'.")
                if drop_original: cols_to_drop.append(col)

        # 4. Creation
        for create in request.config.creation:
            new_col = create.get("new_column")
            formula = create.get("formula")
            if not new_col or not formula:
                continue
            
            try:
                df[new_col] = df.eval(formula)
                summary.append(f"Created new column '{new_col}' using formula '{formula}'.")
            except Exception as e:
                summary.append(f"Failed to create column '{new_col}' using formula '{formula}': {str(e)}")

        if cols_to_drop:
            # unique columns to drop
            cols_to_drop = list(set(cols_to_drop))
            df = df.drop(columns=cols_to_drop)
            summary.append(f"Dropped original columns: {', '.join(cols_to_drop)}.")

        # Save to disk if requested
        if request.save_to_disk and request.file_path:
            if request.file_path.endswith(".csv"):
                df.to_csv(request.file_path, index=False)
            elif request.file_path.endswith((".xls", ".xlsx")):
                df.to_excel(request.file_path, index=False)

        # Return preview to save bandwidth
        preview_df = df.head(100)
        cleaned_data = preview_df.replace({np.nan: None}).to_dict(orient='records')
        
        return {
            "success": True,
            "summary": summary,
            "data": cleaned_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AutoMLRequest(BaseModel):
    file_path: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    target_column: str
    feature_columns: List[str]
    model_type: str
    test_size: float = 0.2

@app.post("/api/automl/regression")
async def automl_regression(request: AutoMLRequest):
    try:
        if request.file_path and os.path.exists(request.file_path):
            if request.file_path.endswith(".csv"):
                df = pd.read_csv(request.file_path)
            elif request.file_path.endswith((".xls", ".xlsx")):
                df = pd.read_excel(request.file_path)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
        elif request.data:
            df = pd.DataFrame(request.data)
        else:
            raise HTTPException(status_code=400, detail="Either file_path or data must be provided")
        target = request.target_column
        features = request.feature_columns
        model_type = request.model_type
        
        if target not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target}' not found.")
            
        for f in features:
            if f not in df.columns:
                raise HTTPException(status_code=400, detail=f"Feature column '{f}' not found.")
                
        # Drop rows with NaN in target or features
        df = df.dropna(subset=[target] + features)
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="No data left after dropping NaNs.")
            
        X = df[features]
        y = df[target]
        
        # Ensure numeric features (simple auto-encoding for categoricals)
        X = pd.get_dummies(X, drop_first=True)
        # Ensure target is numeric
        if not pd.api.types.is_numeric_dtype(y):
            raise HTTPException(status_code=400, detail="Target column must be numeric for regression.")
            
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=request.test_size, random_state=42)
        
        # Scale features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        model = None
        is_poly = False
        poly_features = None
        
        if model_type == 'linear':
            model = LinearRegression()
        elif model_type == 'polynomial':
            is_poly = True
            poly_features = PolynomialFeatures(degree=2, include_bias=False)
            X_train_scaled = poly_features.fit_transform(X_train_scaled)
            X_test_scaled = poly_features.transform(X_test_scaled)
            model = LinearRegression()
        elif model_type == 'ridge':
            model = Ridge(alpha=1.0)
        elif model_type == 'lasso':
            model = Lasso(alpha=0.1)
        elif model_type == 'random_forest':
            model = RandomForestRegressor(n_estimators=100, random_state=42)
        elif model_type == 'knn':
            model = KNeighborsRegressor(n_neighbors=5)
        elif model_type == 'svr':
            model = SVR(kernel='rbf')
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model type '{model_type}'")
            
        model.fit(X_train_scaled, y_train)
        y_pred = model.predict(X_test_scaled)
        
        # Metrics
        mse = mean_squared_error(y_test, y_pred)
        rmse = float(np.sqrt(mse))
        mae = float(mean_absolute_error(y_test, y_pred))
        r2 = float(r2_score(y_test, y_pred))
        
        # Feature Importance / Coefficients
        importance = []
        feature_names = X.columns.tolist()
        
        if is_poly:
            feature_names = poly_features.get_feature_names_out(feature_names).tolist()
            
        if hasattr(model, 'coef_'):
            coefs = model.coef_
            importance = [{"feature": fn, "importance": float(c)} for fn, c in zip(feature_names, coefs)]
        elif hasattr(model, 'feature_importances_'):
            imps = model.feature_importances_
            importance = [{"feature": fn, "importance": float(i)} for fn, i in zip(feature_names, imps)]
            
        # Sort importance by absolute value descending
        importance.sort(key=lambda x: abs(x['importance']), reverse=True)
        # Limit to top 20
        importance = importance[:20]
        
        # Equation string for linear models
        equation = None
        if hasattr(model, 'intercept_') and hasattr(model, 'coef_'):
            try:
                intercept = float(model.intercept_)
                coefs = model.coef_
                terms = []
                for fn, c in zip(feature_names, coefs):
                    if abs(c) > 1e-4:
                        terms.append(f"({c:.4f} × {fn})")
                if terms:
                    equation = f"Y = {intercept:.4f} + " + " + ".join(terms)
                else:
                    equation = f"Y = {intercept:.4f}"
            except Exception:
                pass
        
        # Sample for Actual vs Predicted Plot
        # Get up to 100 points
        sample_size = min(100, len(y_test))
        indices = np.random.choice(len(y_test), sample_size, replace=False)
        actual_sample = y_test.iloc[indices].tolist()
        pred_sample = y_pred[indices].tolist()
        
        plot_data = [{"actual": float(a), "predicted": float(p)} for a, p in zip(actual_sample, pred_sample)]
        
        return {
            "success": True,
            "metrics": {
                "rmse": rmse,
                "mae": mae,
                "r2": r2
            },
            "importance": importance,
            "plot_data": plot_data,
            "model_type": model_type,
            "equation": equation
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ABTestRequest(BaseModel):
    data: List[Dict[str, Any]]
    metric_column: str
    group_column: str
    control_group: str
    treatment_group: str

@app.post("/api/stats/ab-test")
async def ab_test(request: ABTestRequest):
    try:
        df = pd.DataFrame(request.data)
        metric = request.metric_column
        group = request.group_column
        control = request.control_group
        treatment = request.treatment_group
        
        if metric not in df.columns or group not in df.columns:
            raise HTTPException(status_code=400, detail="Metric or Group column not found in data")
            
        df[metric] = pd.to_numeric(df[metric], errors='coerce')
        df = df.dropna(subset=[metric, group])
        
        control_data = df[df[group].astype(str) == str(control)][metric]
        treatment_data = df[df[group].astype(str) == str(treatment)][metric]
        
        if len(control_data) == 0 or len(treatment_data) == 0:
            raise HTTPException(status_code=400, detail="Salah satu atau kedua grup tidak memiliki data")
            
        control_mean = control_data.mean()
        treatment_mean = treatment_data.mean()
        
        if control_mean == 0:
            diff_pct = 0.0
        else:
            diff_pct = ((treatment_mean - control_mean) / abs(control_mean)) * 100
            
        t_stat, p_val = ttest_ind(treatment_data, control_data, equal_var=False)
        
        is_sig = bool(p_val < 0.05)
        
        if is_sig:
            if treatment_mean > control_mean:
                conclusion = f"Grup {treatment} secara signifikan lebih tinggi daripada grup {control}."
            else:
                conclusion = f"Grup {treatment} secara signifikan lebih rendah daripada grup {control}."
        else:
            conclusion = f"Tidak ada perbedaan signifikan antara grup {treatment} dan grup {control}."
            
        return {
            "success": True,
            "control_mean": float(control_mean) if not pd.isna(control_mean) else 0.0,
            "treatment_mean": float(treatment_mean) if not pd.isna(treatment_mean) else 0.0,
            "difference_percentage": float(diff_pct) if not pd.isna(diff_pct) else 0.0,
            "t_statistic": float(t_stat) if not pd.isna(t_stat) else 0.0,
            "p_value": float(p_val) if not pd.isna(p_val) else 1.0,
            "is_significant": is_sig,
            "conclusion": conclusion
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PredictRequest(BaseModel):
    file_path: Optional[str] = None
    data: Optional[List[Dict[str, Any]]] = None
    target_column: str
    feature_columns: List[str]
    model_type: str
    inputs: Dict[str, float]

@app.post("/api/automl/predict")
async def automl_predict(request: PredictRequest):
    try:
        if request.file_path and os.path.exists(request.file_path):
            if request.file_path.endswith(".csv"):
                df = pd.read_csv(request.file_path)
            elif request.file_path.endswith((".xls", ".xlsx")):
                df = pd.read_excel(request.file_path)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
        elif request.data:
            df = pd.DataFrame(request.data)
        else:
            raise HTTPException(status_code=400, detail="Either file_path or data must be provided")
        target = request.target_column
        features = request.feature_columns
        model_type = request.model_type
        
        # Drop rows with NaN
        df = df.dropna(subset=[target] + features)
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="No data left after dropping NaNs.")
            
        X = df[features]
        y = df[target]
        
        X = pd.get_dummies(X, drop_first=True)
        
        input_dict = {f: [request.inputs.get(f, 0.0)] for f in features}
        input_df = pd.DataFrame(input_dict)
        input_df = pd.get_dummies(input_df, drop_first=True)
        
        for col in X.columns:
            if col not in input_df.columns:
                input_df[col] = 0.0
        input_df = input_df[X.columns]
        
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        input_scaled = scaler.transform(input_df)
        
        model = None
        if model_type == 'linear':
            model = LinearRegression()
        elif model_type == 'polynomial':
            poly_features = PolynomialFeatures(degree=2, include_bias=False)
            X_scaled = poly_features.fit_transform(X_scaled)
            input_scaled = poly_features.transform(input_scaled)
            model = LinearRegression()
        elif model_type == 'ridge':
            model = Ridge(alpha=1.0)
        elif model_type == 'lasso':
            model = Lasso(alpha=0.1)
        elif model_type == 'random_forest':
            model = RandomForestRegressor(n_estimators=100, random_state=42)
        elif model_type == 'knn':
            model = KNeighborsRegressor(n_neighbors=5)
        elif model_type == 'svr':
            model = SVR(kernel='rbf')
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model type '{model_type}'")
            
        model.fit(X_scaled, y)
        prediction = model.predict(input_scaled)[0]
        
        return {
            "success": True,
            "prediction": float(prediction)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SQLExecuteRequest(BaseModel):
    data: List[Dict[str, Any]]
    query: str

@app.post("/api/sql/execute")
async def execute_sql(request: SQLExecuteRequest):
    try:
        import duckdb
        if not request.data:
            raise HTTPException(status_code=400, detail="Data is empty")
        if not request.query:
            raise HTTPException(status_code=400, detail="Query is empty")
            
        df = pd.DataFrame(request.data)
        
        con = duckdb.connect(database=':memory:')
        con.register('data', df)
        
        result_df = con.execute(request.query).df()
        result_data = result_df.replace({np.nan: None}).to_dict(orient='records')
        
        return {
            "success": True,
            "data": result_data,
            "columns": list(result_df.columns),
            "rows": len(result_df)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class SQLExecuteExternalRequest(BaseModel):
    host: str
    port: int
    user: str
    encrypted_password: str
    db_name: str
    query: str
    db_type: str

@app.post("/api/sql/execute-external")
async def execute_external_sql(request: SQLExecuteExternalRequest):
    try:
        import security
        from sqlalchemy import create_engine, text
        from sqlalchemy.exc import ResourceClosedError
        
        password = security.decrypt_password(request.encrypted_password)
        
        if request.db_type.lower() == 'mysql':
            connection_url = f"mysql+pymysql://{request.user}:{password}@{request.host}:{request.port}/{request.db_name}"
        elif request.db_type.lower() in ['postgresql', 'postgres']:
            connection_url = f"postgresql+psycopg2://{request.user}:{password}@{request.host}:{request.port}/{request.db_name}"
        else:
            raise HTTPException(status_code=400, detail="Unsupported database type")
            
        engine = create_engine(connection_url)
        with engine.begin() as conn:
            try:
                df = pd.read_sql(text(request.query), conn)
                result_data = df.replace({np.nan: None}).to_dict(orient='records')
                return {
                    "success": True,
                    "data": result_data,
                    "columns": list(df.columns),
                    "rows": len(df)
                }
            except ResourceClosedError:
                return {
                    "success": True,
                    "data": [],
                    "columns": [],
                    "rows": 0,
                    "message": "Query executed successfully. No data returned."
                }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


class ABTestRequest(BaseModel):
    data: List[Dict[str, Any]]
    metric_column: str
    group_column: str
    control_group: str
    treatment_group: str

@app.post("/api/stats/ab-test")
async def ab_test(request: ABTestRequest):
    try:
        from scipy.stats import ttest_ind
        
        if not request.data:
            raise HTTPException(status_code=400, detail="Data is empty")
            
        df = pd.DataFrame(request.data)
        
        metric = request.metric_column
        group = request.group_column
        control = request.control_group
        treatment = request.treatment_group
        
        if metric not in df.columns or group not in df.columns:
            raise HTTPException(status_code=400, detail="Columns not found")
            
        control_data = df[df[group] == control][metric].dropna()
        treatment_data = df[df[group] == treatment][metric].dropna()
        
        if len(control_data) == 0 or len(treatment_data) == 0:
            raise HTTPException(status_code=400, detail="Not enough data in one or both groups")
            
        stat, p_value = ttest_ind(control_data, treatment_data, equal_var=False)
        
        control_mean = float(control_data.mean())
        treatment_mean = float(treatment_data.mean())
        
        diff = treatment_mean - control_mean
        diff_pct = (diff / control_mean) * 100 if control_mean != 0 else 0
        
        is_significant = p_value < 0.05
        
        if is_significant:
            if diff > 0:
                conclusion = f"Significant! '{treatment}' performs {diff_pct:.2f}% better than '{control}' (p-value={p_value:.4f})."
            else:
                conclusion = f"Significant! '{treatment}' performs {abs(diff_pct):.2f}% worse than '{control}' (p-value={p_value:.4f})."
        else:
            conclusion = f"Not Significant. The difference of {diff_pct:.2f}% is likely due to chance (p-value={p_value:.4f})."
            
        return {
            "success": True,
            "t_statistic": float(stat),
            "p_value": float(p_value),
            "is_significant": bool(is_significant),
            "control_mean": control_mean,
            "treatment_mean": treatment_mean,
            "difference_percentage": float(diff_pct),
            "conclusion": conclusion
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class TimeSeriesRequest(BaseModel):
    data: List[Dict[str, Any]]
    date_column: str
    target_column: str
    period: Optional[int] = None
    freq: Optional[str] = None

@app.post("/api/time-series/decompose")
async def time_series_decompose(request: TimeSeriesRequest):
    try:
        from statsmodels.tsa.seasonal import seasonal_decompose
        
        df = pd.DataFrame(request.data)
        df[request.date_column] = pd.to_datetime(df[request.date_column])
        df = df.sort_values(by=request.date_column).set_index(request.date_column)
        
        # Fill missing with interpolation
        ts = df[request.target_column].interpolate(method='linear')
        
        period = request.period
        if period is None:
            if len(ts) > 365:
                period = 365
            elif len(ts) > 30:
                period = 7
            else:
                period = 3
                
        result = seasonal_decompose(ts, model='additive', period=period)
        
        dates = [d.strftime('%Y-%m-%d %H:%M:%S') for d in ts.index]
        
        return {
            "success": True,
            "dates": dates,
            "observed": result.observed.replace({np.nan: None}).tolist(),
            "trend": result.trend.replace({np.nan: None}).tolist(),
            "seasonal": result.seasonal.replace({np.nan: None}).tolist(),
            "residual": result.resid.replace({np.nan: None}).tolist()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class TimeSeriesForecastRequest(BaseModel):
    data: List[Dict[str, Any]]
    date_column: str
    target_column: str
    periods: int = 10
    model_type: str = 'arima'
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@app.post("/api/time-series/forecast")
async def time_series_forecast(request: TimeSeriesForecastRequest):
    try:
        df = pd.DataFrame(request.data)
        df[request.date_column] = pd.to_datetime(df[request.date_column])
        
        # Apply date range filtering if provided
        if request.start_date:
            df = df[df[request.date_column] >= pd.to_datetime(request.start_date)]
        if request.end_date:
            df = df[df[request.date_column] <= pd.to_datetime(request.end_date)]
            
        if len(df) < 3:
            raise ValueError("Not enough data points after filtering date range.")
            
        df = df.sort_values(by=request.date_column)
        
        ts = df[request.target_column].interpolate(method='linear').values
        
        forecast_values = []
        lower_bound = []
        upper_bound = []
        
        if request.model_type == 'arima':
            from statsmodels.tsa.arima.model import ARIMA
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model = ARIMA(ts, order=(1, 1, 1))
                fitted = model.fit()
                forecast = fitted.get_forecast(steps=request.periods)
                forecast_values = forecast.predicted_mean.tolist()
                conf_int = forecast.conf_int(alpha=0.05)
                lower_bound = conf_int[:, 0].tolist()
                upper_bound = conf_int[:, 1].tolist()
        elif request.model_type == 'hw':
            from statsmodels.tsa.holtwinters import ExponentialSmoothing
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model = ExponentialSmoothing(ts, trend='add', seasonal=None)
                fitted = model.fit()
                forecast_values = fitted.forecast(request.periods).tolist()
                std = np.std(ts - fitted.fittedvalues) if len(ts) > 2 else 0
                lower_bound = [val - 1.96 * std for val in forecast_values]
                upper_bound = [val + 1.96 * std for val in forecast_values]
        else:
            raise ValueError("Unsupported model type")
            
        last_date = df[request.date_column].iloc[-1]
        freq = pd.infer_freq(df[request.date_column])
        if not freq:
            diffs = df[request.date_column].diff().dropna()
            if len(diffs) > 0:
                avg_diff = diffs.mean()
            else:
                avg_diff = pd.Timedelta(days=1)
            future_dates = [last_date + (i+1) * avg_diff for i in range(request.periods)]
        else:
            future_dates = pd.date_range(start=last_date, periods=request.periods+1, freq=freq)[1:]
            
        historical_dates = df[request.date_column].dt.strftime('%Y-%m-%d %H:%M:%S').tolist()
        future_dates_str = [d.strftime('%Y-%m-%d %H:%M:%S') for d in future_dates]
        
        # Calculate dynamic trend narrative
        narrative = []
        try:
            # Combine historical and forecast to find trend changes
            hist_df = pd.DataFrame({'date': df[request.date_column], 'val': ts})
            fut_df = pd.DataFrame({'date': pd.to_datetime(future_dates), 'val': forecast_values})
            combined = pd.concat([hist_df, fut_df])
            
            time_span = (combined['date'].max() - combined['date'].min()).days
            
            # Decide aggregation period
            if time_span > 730: # > 2 years -> group by year
                combined['period'] = combined['date'].dt.year.astype(str)
                period_name = "Year"
            elif time_span > 60: # > 2 months -> group by month
                combined['period'] = combined['date'].dt.strftime('%Y-%m')
                period_name = "Month"
            else: # Daily
                combined['period'] = combined['date'].dt.strftime('%Y-%m-%d')
                period_name = "Day"
                
            agg = combined.groupby('period')['val'].mean().reset_index()
            agg['pct_change'] = agg['val'].pct_change() * 100
            
            for _, row in agg.dropna().iterrows():
                period = row['period']
                pct = row['pct_change']
                if abs(pct) > 0.1: # Only report if change is > 0.1%
                    direction = "naik" if pct > 0 else "turun"
                    narrative.append(f"{period} {direction} {abs(pct):.1f}%")
                    
            if not narrative:
                narrative.append("Tidak ada perubahan tren yang signifikan.")
        except Exception as e:
            narrative.append("Gagal menghitung naratif tren.")
            
        # Calculate overall trend slope for the selected range
        overall_trend = "Tetap"
        if len(ts) > 1:
            slope, _, _, _, _ = linregress(range(len(ts)), ts)
            if slope > 0.01 * np.mean(ts):
                overall_trend = "Naik (Positif)"
            elif slope < -0.01 * np.mean(ts):
                overall_trend = "Turun (Negatif)"
        
        return {
            "success": True,
            "historical": {
                "dates": historical_dates,
                "values": ts.tolist()
            },
            "forecast": {
                "dates": future_dates_str,
                "values": forecast_values,
                "lower": lower_bound,
                "upper": upper_bound
            },
            "insights": {
                "narrative": narrative,
                "overall_trend": overall_trend,
                "period_type": period_name if 'period_name' in locals() else "Unknown"
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class AIChatRequest(BaseModel):
    message: str
    context: Dict[str, Any] = {}

@app.post("/api/ai/chat")
async def ai_chat(request: AIChatRequest):
    try:
        import urllib.request
        import urllib.error
        import json

        msg = request.message
        context = request.context
        pathname = context.get('pathname', '')
        dataset = context.get('datasetName', 'Dataset') or 'Dataset'
        active_selection = context.get('activeSelection', 'None')
        current_chart = context.get('currentChartInfo', 'None')
        columns = context.get('columns', [])
        available_datasets = context.get('availableDatasets', [])
        
        system_prompt = f"""You are DataLens AI, an expert data analyst assistant.
Always consider the following context of the user:
- Current Page: {pathname}
- Active Dataset: {dataset}
- Active Selection: {active_selection}
- Current Chart: {current_chart}
- Dataset Columns: {columns}
- Available Datasets in Workspace: {available_datasets}

You MUST respond ONLY with a valid JSON object. No markdown blocks, no ```json, just the raw JSON object itself.
Format:
{{
  "response_text": "Friendly narrative response for the user, answering their request based on context. Explain the data naturally.",
  "actions": [
    {{ "type": "ADD_TO_REPORT", "payload": {{ "title": "A short title", "content": "Narrative or details to add to report." }} }},
    {{ "type": "NAVIGATE", "payload": {{ "path": "/path-to-navigate" }} }}
  ]
}}
If no actions are needed (like adding to report or navigating), leave the "actions" array empty. Provide a helpful analytical response in "response_text". Be concise, insightful, and professional.
"""

        import os
        token = os.getenv("GITHUB_PAT", "YOUR_GITHUB_PAT")
        url = "https://models.inference.ai.azure.com/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        data = {
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": msg}
            ],
            "temperature": 0.2
        }
        
        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
        
        try:
            with urllib.request.urlopen(req) as response:
                response_body = response.read().decode('utf-8')
                result = json.loads(response_body)
                content = result['choices'][0]['message']['content']
                
                # Cleanup potential markdown wrapper
                content = content.strip()
                if content.startswith('```json'):
                    content = content[7:]
                if content.startswith('```'):
                    content = content[3:]
                if content.endswith('```'):
                    content = content[:-3]
                content = content.strip()
                
                parsed = json.loads(content)
                return {
                    "success": True,
                    "response_text": parsed.get("response_text", "Saya tidak dapat merespons dengan benar."),
                    "actions": parsed.get("actions", [])
                }
        except Exception as e:
            # Fallback if API fails
            print("API Error:", e)
            return {
                "success": True,
                "response_text": f"Maaf, saya mengalami kendala saat memproses permintaan Anda melalui API. (Error: {str(e)})",
                "actions": []
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GenerateReportRequest(BaseModel):
    dataset_name: str
    stats: Dict[str, Any]
    language: str = "English"

@app.post("/api/ai/generate-report")
async def generate_report(request: GenerateReportRequest):
    try:
        import urllib.request
        import urllib.error
        import json
        
        system_prompt = f"""You are an expert Data Analyst AI.
The user has requested an executive summary of their dataset profiling results.
You will be provided with the JSON output of the data profiling module.

Write a comprehensive, professional Executive Summary in Markdown format.
The summary MUST be written in {request.language}.

Include:
1. High-level dataset health (rows, columns, completeness).
2. Key insights based on column types, missing values, or correlations.
3. Noteworthy alerts or data quality issues to watch out for.
4. Keep it concise, analytical, and highly professional. DO NOT INCLUDE ANY MARKDOWN CODE BLOCKS like ```markdown. Return just the raw markdown text.
"""
        
        import os
        token = os.getenv("GITHUB_PAT", "YOUR_GITHUB_PAT")
        url = "https://models.inference.ai.azure.com/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
        
        # Cap stats size to prevent token overflow
        stats_str = json.dumps(request.stats)[:8000]
        
        data = {
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Dataset Name: {request.dataset_name}\n\nStats:\n{stats_str}"}
            ],
            "temperature": 0.3
        }
        
        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
        
        try:
            with urllib.request.urlopen(req) as response:
                response_body = response.read().decode('utf-8')
                result = json.loads(response_body)
                content = result['choices'][0]['message']['content']
                
                content = content.strip()
                if content.startswith('```markdown'):
                    content = content[11:]
                elif content.startswith('```'):
                    content = content[3:]
                if content.endswith('```'):
                    content = content[:-3]
                content = content.strip()
                
                return {
                    "success": True,
                    "markdown": content
                }
        except Exception as e:
            print("API Error:", e)
            raise HTTPException(status_code=500, detail=str(e))
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SegmentationRequest(BaseModel):
    file_path: str
    customer_id_col: str
    date_col: str
    amount_col: str
    n_clusters: int = 3

@app.post("/api/stats/segmentation")
async def customer_segmentation(req: SegmentationRequest):
    try:
        import pandas as pd
        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler
        import numpy as np
        import os

        if not os.path.exists(req.file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        df = pd.read_csv(req.file_path)
        
        df[req.date_col] = pd.to_datetime(df[req.date_col])
        reference_date = df[req.date_col].max() + pd.Timedelta(days=1)
        
        rfm = df.groupby(req.customer_id_col).agg({
            req.date_col: lambda x: (reference_date - x.max()).days,
            req.customer_id_col: 'count',
            req.amount_col: 'sum'
        }).rename(columns={
            req.date_col: 'Recency',
            req.customer_id_col: 'Frequency',
            req.amount_col: 'Monetary'
        }).reset_index()
        
        features = rfm[['Recency', 'Frequency', 'Monetary']]
        scaler = StandardScaler()
        rfm_scaled = scaler.fit_transform(features)
        
        kmeans = KMeans(n_clusters=req.n_clusters, random_state=42, n_init=10)
        rfm['Cluster'] = kmeans.fit_predict(rfm_scaled)
        
        summary = rfm.groupby('Cluster').agg({
            'Recency': 'mean',
            'Frequency': 'mean',
            'Monetary': ['mean', 'count']
        }).reset_index()
        
        summary.columns = ['Cluster', 'RecencyMean', 'FrequencyMean', 'MonetaryMean', 'Count']
        
        return {
            "success": True, 
            "message": f"Successfully grouped customers into {req.n_clusters} clusters.",
            "summary": summary.to_dict(orient="records"),
            "data": rfm.head(100).to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class MarketBasketRequest(BaseModel):
    file_path: str
    transaction_id_col: str
    item_id_col: str
    min_support: float = 0.05

@app.post("/api/stats/market-basket")
async def market_basket(req: MarketBasketRequest):
    try:
        import pandas as pd
        from mlxtend.frequent_patterns import apriori, association_rules
        import os

        if not os.path.exists(req.file_path):
            raise HTTPException(status_code=404, detail="File not found")
            
        df = pd.read_csv(req.file_path)
        
        # Basket format
        basket = (df.groupby([req.transaction_id_col, req.item_id_col])[req.item_id_col]
                  .count().unstack().reset_index().fillna(0).set_index(req.transaction_id_col))
        
        def encode_units(x):
            if x <= 0: return False
            if x >= 1: return True
        
        basket_sets = basket.map(encode_units)
        
        frequent_itemsets = apriori(basket_sets, min_support=req.min_support, use_colnames=True)
        
        if frequent_itemsets.empty:
            return {"success": True, "message": "No frequent itemsets found with the given support threshold.", "rules": []}
            
        rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1)
        
        rules['antecedents'] = rules['antecedents'].apply(lambda x: ', '.join(list(x)))
        rules['consequents'] = rules['consequents'].apply(lambda x: ', '.join(list(x)))
        
        rules_dict = rules.sort_values('lift', ascending=False).head(50).to_dict(orient="records")
        
        return {
            "success": True, 
            "message": f"Found {len(rules)} association rules.",
            "rules": rules_dict
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AnomalyRequest(BaseModel):
    file_path: str
    columns: list[str]
    contamination: float = 0.05

@app.post("/api/stats/anomaly")
async def anomaly_detection(req: AnomalyRequest):
    try:
        import pandas as pd
        from sklearn.ensemble import IsolationForest
        from sklearn.preprocessing import StandardScaler
        import os

        if not os.path.exists(req.file_path):
            raise HTTPException(status_code=404, detail="File not found")
            
        df = pd.read_csv(req.file_path)
        
        features = df[req.columns].dropna()
        
        if features.empty:
            raise HTTPException(status_code=400, detail="No valid data in selected columns.")
            
        scaler = StandardScaler()
        scaled_features = scaler.fit_transform(features)
        
        clf = IsolationForest(contamination=req.contamination, random_state=42)
        preds = clf.fit_predict(scaled_features)
        
        features['IsAnomaly'] = preds
        features['IsAnomaly'] = features['IsAnomaly'].map({1: False, -1: True})
        
        anomalies = features[features['IsAnomaly'] == True]
        
        return {
            "success": True, 
            "message": f"Detected {len(anomalies)} anomalies out of {len(features)} rows.",
            "anomaly_indices": anomalies.index.tolist()[:100],
            "data": anomalies.head(50).to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class WhatIfRequest(BaseModel):
    file_path: str
    target_col: str
    feature_col: str
    change_percentage: float

@app.post("/api/stats/what-if")
async def what_if_simulator(req: WhatIfRequest):
    try:
        import pandas as pd
        from sklearn.linear_model import LinearRegression
        import numpy as np
        import os

        if not os.path.exists(req.file_path):
            raise HTTPException(status_code=404, detail="File not found")
            
        df = pd.read_csv(req.file_path)
        
        if req.feature_col not in df.columns or req.target_col not in df.columns:
            raise HTTPException(status_code=400, detail="Columns not found")
            
        df_clean = df[[req.feature_col, req.target_col]].dropna()
        X = df_clean[[req.feature_col]].values
        y = df_clean[req.target_col].values
        
        model = LinearRegression()
        model.fit(X, y)
        
        base_y_pred = model.predict(X).mean()
        
        X_new = X * (1 + req.change_percentage / 100.0)
        new_y_pred = model.predict(X_new).mean()
        
        diff = new_y_pred - base_y_pred
        diff_pct = (diff / base_y_pred) * 100 if base_y_pred != 0 else 0
        
        return {
            "success": True, 
            "message": f"Simulated a {req.change_percentage}% change on {req.feature_col}.",
            "baseline_target_avg": float(base_y_pred),
            "simulated_target_avg": float(new_y_pred),
            "difference": float(diff),
            "difference_percentage": float(diff_pct)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CohortRequest(BaseModel):
    file_path: str
    user_id_col: str
    date_col: str

@app.post("/api/stats/cohort")
async def cohort_analysis(req: CohortRequest):
    try:
        import pandas as pd
        import numpy as np
        import os

        if not os.path.exists(req.file_path):
            raise HTTPException(status_code=404, detail="File not found")
            
        df = pd.read_csv(req.file_path)
        df[req.date_col] = pd.to_datetime(df[req.date_col])
        
        df['InvoiceMonth'] = df[req.date_col].dt.to_period('M')
        df['CohortMonth'] = df.groupby(req.user_id_col)['InvoiceMonth'].transform('min')
        
        def get_date_int(df, column):
            year = df[column].dt.year
            month = df[column].dt.month
            return year, month
        
        invoice_year, invoice_month = get_date_int(df, 'InvoiceMonth')
        cohort_year, cohort_month = get_date_int(df, 'CohortMonth')
        
        years_diff = invoice_year - cohort_year
        months_diff = invoice_month - cohort_month
        
        df['CohortIndex'] = years_diff * 12 + months_diff + 1
        
        grouping = df.groupby(['CohortMonth', 'CohortIndex'])
        cohort_data = grouping[req.user_id_col].apply(pd.Series.nunique).reset_index()
        
        cohort_counts = cohort_data.pivot(index='CohortMonth', columns='CohortIndex', values=req.user_id_col)
        
        cohort_sizes = cohort_counts.iloc[:,0]
        retention = cohort_counts.divide(cohort_sizes, axis=0)
        retention = retention.round(3) * 100
        
        retention.index = retention.index.astype(str)
        retention = retention.replace({np.nan: None})
        
        return {
            "success": True, 
            "message": "Generated Cohort Retention Matrix.",
            "cohort_matrix": retention.to_dict(orient="index")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
