import asyncio
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services import auction_service

logger = logging.getLogger("auctionhub.scheduler")


async def run_periodic_scheduler(interval_seconds: int = 30):
    """
    Background job runner for:
    1. Activating scheduled auctions whose start_time has arrived.
    2. Closing expired auctions (Phase 12).
    3. Cascading non-paid winner payment windows (Phase 13).
    """
    logger.info("Starting Auction Hub Background Scheduler...")
    while True:
        try:
            db: Session = SessionLocal()
            try:
                # 1. Activate scheduled auctions
                activated = auction_service.update_due_scheduled_auctions(db)
                if activated > 0:
                    logger.info(f"Activated {activated} scheduled auctions.")

                # Phase 12 & 13 hooks will be called here
                # auction_service.close_expired_auctions(db)
                # auction_service.handle_payment_expiries(db)
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error in background scheduler cycle: {e}")

        await asyncio.sleep(interval_seconds)

