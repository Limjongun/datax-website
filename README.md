# AI Data Analyst Platform

## Overview
This repository contains the source code for the AI Data Analyst Platform, a comprehensive system designed to integrate data processing, visualization, and artificial intelligence into a single environment. The platform aims to bridge the gap between traditional spreadsheet operations and advanced machine learning analytics.

## System Architecture

The platform is structured using a modern monorepo architecture to separate concerns while maintaining code consistency across applications and shared packages.

### 1. High-Level Architecture
- **Client Layer**: A web-based interface serving as the primary interaction point for users, optimized for complex data grid rendering and interactive visualizations.
- **API Gateway & Services Layer**: A robust backend responsible for routing requests, handling authentication, and orchestrating data processing pipelines.
- **Processing Engines**:
  - *Data Engine*: Handles ETL operations, data profiling, data cleaning, and feature engineering.
  - *AI Engine*: Integrates with Large Language Models (LLMs) for natural language data querying, insight generation, and automated reporting.
  - *Report Engine*: Compiles visualizations and analytical summaries into downloadable document formats.
- **Storage Layer**: Relational databases for metadata and user states, scalable object storage for raw dataset files, and in-memory stores for caching and background job queuing.

### 2. Technology Stack

#### Frontend
- **Framework**: Next.js (React), TypeScript
- **State Management**: Zustand, TanStack Query
- **UI & Styling**: Tailwind CSS, ShadCN UI
- **Data Visualization**: Apache ECharts, AG Grid Enterprise
- **Data Parsing**: PapaParse, SheetJS

#### Backend
- **Framework**: FastAPI (Python)
- **Data Processing**: Polars, Pandas, NumPy, Scikit-Learn
- **Background Tasks**: Celery, Redis Queue
- **AI Integration**: LangChain, LangGraph

#### Infrastructure & Storage
- **Database**: PostgreSQL
- **Cache & Queue**: Redis
- **Object Storage**: S3-compatible Object Storage

### 3. Core Modules

- **Dataset Management**: Centralized repository for uploading, versioning, and parsing various data formats (CSV, XLSX, JSON, Parquet).
- **Data Profiling & Cleaning**: Automated statistical summaries, missing value detection, outlier handling, and data type validation.
- **Feature Engineering**: Tools for scaling, encoding, and generating new features programmatically.
- **Data Visualization**: Interactive dashboard builder with customizable charting capabilities.
- **SQL Training Camp**: An interactive environment for querying datasets and executing SQL operations.
- **AI Analyst**: Natural language interfaces allowing users to query data, receive executive summaries, and generate root cause analyses autonomously.

## Monorepo Structure

The codebase is organized into distinct applications and shared packages:

- `apps/web/`: The Next.js frontend application.
- `apps/api/`: The FastAPI backend application.
- `packages/ui/`: Shared UI components.
- `packages/charts/`: Reusable charting and visualization logic.
- `packages/grid/`: Data grid configurations.
- `packages/shared/`: Common utilities and types.
- `infrastructure/`: Deployment configurations and container orchestration scripts.

## Deployment Strategy

The application components are designed to be containerized and deployed independently to ensure scalability:
- The frontend application is deployed on edge networks for optimal latency.
- The backend API and background workers operate on scalable virtual instances.
- Persistent layers (PostgreSQL and Object Storage) are managed through scalable cloud database services.
