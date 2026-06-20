import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

np.random.seed(42)
random.seed(42)

num_rows = 150

# Generate Customers
customers = [f"CUST-{i:03d}" for i in range(1, 21)]  # 20 customers

# Generate Items and Prices
items_dict = {
    "Laptop": 1000,
    "Mouse": 25,
    "Keyboard": 50,
    "Monitor": 200,
    "Headset": 80,
    "Webcam": 60,
    "Desk": 150,
    "Chair": 120
}
items = list(items_dict.keys())

# Generate Transactions (some transactions have multiple items)
transactions = []
current_date = datetime(2023, 1, 1)

for trx_idx in range(1, 101):  # 100 transactions
    trx_id = f"TRX-{trx_idx:03d}"
    cust_id = random.choice(customers)
    # 1 to 3 items per transaction
    num_items = random.randint(1, 3)
    trx_items = random.sample(items, num_items)
    
    # Introduce association rules manually (e.g., Laptop often bought with Mouse)
    if "Laptop" in trx_items and "Mouse" not in trx_items and random.random() > 0.3:
        if len(trx_items) < 3:
            trx_items.append("Mouse")
        else:
            trx_items[1] = "Mouse"
            
    # Dates: Cohorts
    trx_date = current_date + timedelta(days=random.randint(0, 360))
    date_str = trx_date.strftime("%Y-%m-%d")
    
    for item in trx_items:
        quantity = random.randint(1, 4)
        unit_price = items_dict[item]
        discount_pct = random.randint(0, 25)
        
        # Marketing Spend has slight correlation with Quantity
        marketing_spend = round(random.uniform(10, 100) + (quantity * 10), 2)
        
        # Total Spend calculation
        total_spend = (quantity * unit_price) * (1 - (discount_pct / 100))
        
        # Add anomaly
        if random.random() < 0.05:  # 5% chance of anomaly
            total_spend = total_spend * random.uniform(5, 10)  # Exceptionally high
            quantity = quantity * 10
            
        transactions.append({
            "Transaction_ID": trx_id,
            "Customer_ID": cust_id,
            "Date": date_str,
            "Item_Name": item,
            "Quantity": quantity,
            "Unit_Price": unit_price,
            "Discount_Pct": discount_pct,
            "Marketing_Spend": marketing_spend,
            "Total_Spend": round(total_spend, 2),
            "Customer_Age": random.randint(18, 65),
            "Customer_Income": random.randint(30000, 150000)
        })

df = pd.DataFrame(transactions)
file_path = r"d:\datax\mega_test_dataset.csv"
df.to_csv(file_path, index=False)
print(f"Dataset generated at {file_path} with {len(df)} rows.")
