package com.demo.mpossdk.open

sealed class TransactionResultListener {
    data class OnCompleted(val result: TransactionResult) : TransactionResultListener()
}

sealed class ParamResultListener {
    data object onLoading: ParamResultListener()
    data class OnProgress(val message: String) : ParamResultListener()
    data class OnSuccess(val message: String, val params: Map<String, String>? = null) : ParamResultListener()
    data class OnFailure(val errorData: ErrorData) : ParamResultListener()
}

sealed class PairResultListener {
    data class OnSuccess(val message: String) : PairResultListener()
    data class OnFailure(val errorData: ErrorData) : PairResultListener()
}