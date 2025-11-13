import pandas as pd
import xgboost as xgb
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error

# -------------------------------
# Step 1: Load cleaned CSV
# -------------------------------
df = pd.read_csv("games_data.csv")
pd.set_option('display.max_columns', None)

# -------------------------------
# Step 2: Pull Texas games weeks 1-14 (just for reference)
# -------------------------------
texas_games = df[((df["home_team"] == "Texas") | (df["away_team"] == "Texas")) & (df["week"] <= 14)]
print("📊 Texas games weeks 1-14:")
print(texas_games[["week", "home_team", "away_team", "home_points", "away_points"]])

# -------------------------------
# Step 3: Prepare numeric features and handle missing values
# -------------------------------
feature_cols = [col for col in df.columns if "_fpi_" in col or "_sp_" in col]
numeric_features = df[feature_cols].select_dtypes(include=['int64','float64']).columns.tolist()
X_all = df[numeric_features].fillna(df[numeric_features].mean())
y_all = df[["home_points", "away_points"]].fillna(df[["home_points", "away_points"]].mean())

# -------------------------------
# Step 4: Split into training and prediction sets
# -------------------------------
train_mask = df["week"] <= 13
predict_mask = (df["week"] == 14) & (df["home_sp_conference"].isin(["SEC"]) | df["away_sp_conference"].isin(["SEC"]))  # Assuming these columns exist

X_train = X_all[train_mask]
y_train = y_all[train_mask]

X_predict = X_all[predict_mask]
matchups_week14 = df[predict_mask][["home_team", "away_team"]]

# -------------------------------
# Step 5: Train XGBoost models
# -------------------------------
model_home = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=200, learning_rate=0.1)
model_home.fit(X_train, y_train["home_points"])

model_away = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=200, learning_rate=0.1)
model_away.fit(X_train, y_train["away_points"])

# -------------------------------
# Step 6: Predict week 14 SEC matchups
# -------------------------------
pred_home = model_home.predict(X_predict)
pred_away = model_away.predict(X_predict)

results_week14 = matchups_week14.copy()
results_week14["pred_home_points"] = pred_home.astype(int)
results_week14["pred_away_points"] = pred_away.astype(int)

print("\n🏈 Predicted SEC Week 14 Scores:")
print(results_week14.to_string(index=False))
