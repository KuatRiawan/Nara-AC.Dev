import numpy as np

class RidgeRegressorCompat:
    def __init__(self, alpha=1.0):
        self.alpha = float(alpha)
        self.coef_ = None
        self.intercept_ = 0.0

    def fit(self, X, y):
        X = np.asarray(X, dtype=float)
        y = np.asarray(y, dtype=float)
        X_mean = np.mean(X, axis=0)
        y_mean = float(np.mean(y))
        X_centered = X - X_mean
        y_centered = y - y_mean
        n_features = X.shape[1]
        A = X_centered.T @ X_centered + self.alpha * np.eye(n_features)
        self.coef_ = np.linalg.solve(A, X_centered.T @ y_centered)
        self.intercept_ = float(y_mean - X_mean @ self.coef_)
        return self

    def predict(self, X):
        X = np.asarray(X, dtype=float)
        return X @ self.coef_ + self.intercept_
