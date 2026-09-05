from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class BidError(AppError):
    def __init__(self, code: str, message: str = "", status_code: int = status.HTTP_400_BAD_REQUEST):
        if not message:
            messages = {
                "AUCTION_NOT_ACTIVE": "Auction is not currently active.",
                "AUCTION_TIMING_INVALID": "Auction has not started or has already ended.",
                "SELLER_CANNOT_BID": "Sellers cannot place bids on their own auctions.",
                "BID_TOO_LOW": "Bid amount must exceed current highest bid by at least the minimum increment.",
                "ALREADY_HIGHEST_BIDDER": "You are already the highest bidder.",
                "ACCOUNT_RESTRICTED": "Your account is restricted from placing bids."
            }
            message = messages.get(code, f"Bid rejected: {code}")
        super().__init__(code=code, message=message, status_code=status_code)


class AIServiceError(AppError):
    def __init__(self, code: str = "AI_UNAVAILABLE", message: str = "AI service is temporarily unavailable."):
        super().__init__(code=code, message=message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)


def setup_exception_handlers(app):
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message}}
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        code = "HTTP_ERROR"
        if exc.status_code == status.HTTP_401_UNAUTHORIZED:
            code = "UNAUTHORIZED"
        elif exc.status_code == status.HTTP_403_FORBIDDEN:
            code = "FORBIDDEN"
        elif exc.status_code == status.HTTP_404_NOT_FOUND:
            code = "NOT_FOUND"
        elif exc.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY:
            code = "UNPROCESSABLE_ENTITY"
            
        message = str(exc.detail) if isinstance(exc.detail, str) else "An error occurred"
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": code, "message": message}}
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        first_error = exc.errors()[0] if exc.errors() else {}
        loc = " -> ".join([str(l) for l in first_error.get("loc", []) if l != "body"])
        msg = first_error.get("msg", "Validation error")
        formatted_msg = f"{loc}: {msg}" if loc else msg
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": {"code": "VALIDATION_ERROR", "message": formatted_msg}}
        )

