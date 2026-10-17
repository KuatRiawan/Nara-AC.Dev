"""
Compatibility layer for NARA AC AI Service & Data Science.
Uses scikit-learn and joblib when installed in the environment, and provides
deterministic NumPy/Python implementations when running in a minimal sandbox.
"""
import math
import pickle
import re
from collections import Counter
import numpy as np

try:
    import joblib as _joblib
    dump = _joblib.dump
    load = _joblib.load
except ImportError:
    def dump(obj, path):
        with open(path, "wb") as f:
            pickle.dump(obj, f)
    def load(path):
        with open(path, "rb") as f:
            return pickle.load(f)

class CompatJoblib:
    dump = staticmethod(dump)
    load = staticmethod(load)

joblib = CompatJoblib()

def _tokenize(text, ngram_range=(1, 2)):
    tokens = re.findall(r"[a-z0-9_]+", str(text).lower())
    out = []
    min_n, max_n = ngram_range
    for n in range(min_n, max_n + 1):
        for i in range(len(tokens) - n + 1):
            out.append(" ".join(tokens[i:i+n]))
    return out if out else ["_empty_"]

class FallbackTfidfVectorizer:
    def __init__(self, ngram_range=(1, 2), max_features=2000, min_df=1, max_df=1.0, sublinear_tf=True, **kwargs):
        self.ngram_range = ngram_range
        self.max_features = max_features
        self.min_df = min_df
        self.max_df = max_df
        self.sublinear_tf = sublinear_tf
        self.vocabulary_ = {}
        self.idf_ = None

    def fit(self, raw_documents, y=None):
        docs = [_tokenize(d, self.ngram_range) for d in raw_documents]
        n_docs = max(1, len(docs))
        df_counts = Counter()
        tf_totals = Counter()
        for doc in docs:
            for t in set(doc):
                df_counts[t] += 1
            for t in doc:
                tf_totals[t] += 1
        max_doc_count = self.max_df * n_docs if isinstance(self.max_df, float) else self.max_df
        valid_terms = [
            t for t, df in df_counts.items()
            if df >= self.min_df and df <= max_doc_count
        ]
        valid_terms.sort(key=lambda t: (-tf_totals[t], t))
        if self.max_features:
            valid_terms = valid_terms[:self.max_features]
        self.vocabulary_ = {t: i for i, t in enumerate(valid_terms)}
        self.idf_ = np.zeros(len(self.vocabulary_), dtype=float)
        for t, i in self.vocabulary_.items():
            self.idf_[i] = math.log((1.0 + n_docs) / (1.0 + df_counts[t])) + 1.0
        return self

    def transform(self, raw_documents):
        n_docs = len(raw_documents)
        n_vocab = max(1, len(self.vocabulary_))
        X = np.zeros((n_docs, n_vocab), dtype=float)
        if not self.vocabulary_:
            return X
        for row_idx, d in enumerate(raw_documents):
            tokens = _tokenize(d, self.ngram_range)
            counts = Counter(tokens)
            for t, c in counts.items():
                col = self.vocabulary_.get(t)
                if col is not None:
                    tf = 1.0 + math.log(c) if (self.sublinear_tf and c > 0) else float(c)
                    X[row_idx, col] = tf * self.idf_[col]
            norm = np.linalg.norm(X[row_idx])
            if norm > 0:
                X[row_idx] /= norm
        return X

    def fit_transform(self, raw_documents, y=None):
        return self.fit(raw_documents, y).transform(raw_documents)

class FallbackLabelEncoder:
    def __init__(self):
        self.classes_ = np.array([])
        self._map = {}

    def fit(self, y):
        unique = sorted(set(y))
        self.classes_ = np.array(unique)
        self._map = {val: idx for idx, val in enumerate(unique)}
        return self

    def transform(self, y):
        return np.array([self._map[val] for val in y], dtype=int)

    def fit_transform(self, y):
        return self.fit(y).transform(y)

    def inverse_transform(self, y):
        return np.array([self.classes_[int(i)] for i in y])

class FallbackMultinomialNB:
    def __init__(self, alpha=0.1, **kwargs):
        self.alpha = float(alpha)
        self.classes_ = None
        self.class_log_prior_ = None
        self.feature_log_prob_ = None
        self.X_train_ = None
        self.y_train_ = None

    def fit(self, X, y):
        X = np.asarray(X, dtype=float)
        y = np.asarray(y)
        self.X_train_ = X.copy()
        self.y_train_ = y.copy()
        self.classes_ = np.unique(y)
        n_classes = len(self.classes_)
        n_features = X.shape[1]
        self.class_log_prior_ = np.zeros(n_classes, dtype=float)
        self.feature_log_prob_ = np.zeros((n_classes, n_features), dtype=float)
        for idx, c in enumerate(self.classes_):
            mask = (y == c)
            self.class_log_prior_[idx] = math.log(max(1, np.sum(mask)) / len(y))
            fc = np.sum(X[mask], axis=0) + self.alpha
            self.feature_log_prob_[idx] = np.log(fc / np.sum(fc))
        return self

    def predict_proba(self, X):
        X = np.asarray(X, dtype=float)
        row_norms = np.linalg.norm(X, axis=1)
        jll = (X @ self.feature_log_prob_.T) * 2.5 + self.class_log_prior_
        if self.X_train_ is not None and len(self.X_train_) > 0:
            sims = fallback_cosine_similarity(X, self.X_train_)
            max_sim_per_class = np.zeros((X.shape[0], len(self.classes_)), dtype=float)
            for idx, c in enumerate(self.classes_):
                mask = (self.y_train_ == c)
                if np.any(mask):
                    max_sim_per_class[:, idx] = np.max(sims[:, mask], axis=1)
            jll = jll + max_sim_per_class * 6.0
        jll = jll - np.max(jll, axis=1, keepdims=True)
        exp_jll = np.exp(jll)
        probs = exp_jll / np.sum(exp_jll, axis=1, keepdims=True)
        # If input has zero known vocabulary tokens, return uniform low-confidence distribution
        for r_idx, rn in enumerate(row_norms):
            if rn == 0.0:
                probs[r_idx] = 1.0 / len(self.classes_)
        return probs

    def predict(self, X):
        probs = self.predict_proba(X)
        return self.classes_[np.argmax(probs, axis=1)]

class FallbackLogisticRegression(FallbackMultinomialNB):
    def __init__(self, **kwargs):
        super().__init__(alpha=0.15)

class FallbackLinearSVC(FallbackMultinomialNB):
    def __init__(self, **kwargs):
        super().__init__(alpha=0.1)

def fallback_cosine_similarity(X, Y=None):
    X = np.asarray(X, dtype=float)
    Y = X if Y is None else np.asarray(Y, dtype=float)
    x_norm = np.linalg.norm(X, axis=1, keepdims=True)
    y_norm = np.linalg.norm(Y, axis=1, keepdims=True)
    x_norm[x_norm == 0] = 1.0
    y_norm[y_norm == 0] = 1.0
    return (X / x_norm) @ (Y / y_norm).T

def fallback_train_test_split(X, y, test_size=0.2, random_state=42, stratify=None):
    rng = np.random.RandomState(random_state)
    X_list = list(X)
    y_arr = np.asarray(y)
    if stratify is not None:
        train_idx, test_idx = [], []
        for cls in np.unique(y_arr):
            cls_indices = np.where(y_arr == cls)[0]
            rng.shuffle(cls_indices)
            n_test = max(1, int(round(len(cls_indices) * test_size)))
            if len(cls_indices) <= 1:
                train_idx.extend(cls_indices)
            else:
                test_idx.extend(cls_indices[:n_test])
                train_idx.extend(cls_indices[n_test:])
        rng.shuffle(train_idx)
        rng.shuffle(test_idx)
    else:
        indices = np.arange(len(X_list))
        rng.shuffle(indices)
        split = int(len(X_list) * (1.0 - test_size))
        train_idx, test_idx = indices[:split], indices[split:]
    X_train = [X_list[i] for i in train_idx]
    X_test = [X_list[i] for i in test_idx]
    return X_train, X_test, y_arr[train_idx], y_arr[test_idx]

def fallback_f1_score(y_true, y_pred, average="weighted", zero_division=0):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    classes = np.unique(np.concatenate([y_true, y_pred]))
    f1s, weights = [], []
    for c in classes:
        tp = np.sum((y_true == c) & (y_pred == c))
        fp = np.sum((y_true != c) & (y_pred == c))
        fn = np.sum((y_true == c) & (y_pred != c))
        p = tp / (tp + fp) if (tp + fp) > 0 else float(zero_division)
        r = tp / (tp + fn) if (tp + fn) > 0 else float(zero_division)
        f1 = (2 * p * r / (p + r)) if (p + r) > 0 else float(zero_division)
        f1s.append(f1)
        weights.append(np.sum(y_true == c))
    if average == "weighted" and sum(weights) > 0:
        return float(np.average(f1s, weights=weights))
    return float(np.mean(f1s))

def fallback_precision_score(y_true, y_pred, average="weighted", zero_division=0):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    classes = np.unique(np.concatenate([y_true, y_pred]))
    ps, weights = [], []
    for c in classes:
        tp = np.sum((y_true == c) & (y_pred == c))
        fp = np.sum((y_true != c) & (y_pred == c))
        ps.append(tp / (tp + fp) if (tp + fp) > 0 else float(zero_division))
        weights.append(np.sum(y_true == c))
    return float(np.average(ps, weights=weights)) if sum(weights) > 0 else 0.0

def fallback_recall_score(y_true, y_pred, average="weighted", zero_division=0):
    y_true = np.asarray(y_true)
    y_pred = np.asarray(y_pred)
    classes = np.unique(np.concatenate([y_true, y_pred]))
    rs, weights = [], []
    for c in classes:
        tp = np.sum((y_true == c) & (y_pred == c))
        fn = np.sum((y_true == c) & (y_pred != c))
        rs.append(tp / (tp + fn) if (tp + fn) > 0 else float(zero_division))
        weights.append(np.sum(y_true == c))
    return float(np.average(rs, weights=weights)) if sum(weights) > 0 else 0.0

def fallback_classification_report(y_true, y_pred, target_names=None, zero_division=0):
    return f"Weighted F1: {fallback_f1_score(y_true, y_pred):.4f}, Accuracy: {float(np.mean(np.asarray(y_true) == np.asarray(y_pred))):.4f}"

def fallback_confusion_matrix(y_true, y_pred):
    classes = np.unique(np.concatenate([y_true, y_pred]))
    m = np.zeros((len(classes), len(classes)), dtype=int)
    for t, p in zip(y_true, y_pred):
        m[int(np.where(classes == t)[0][0]), int(np.where(classes == p)[0][0])] += 1
    return m
