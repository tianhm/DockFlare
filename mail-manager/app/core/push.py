import json
import logging
import os
import threading

log = logging.getLogger(__name__)


def send_push_notifications(mailbox_address: str, payload: dict):
    threading.Thread(
        target=_dispatch,
        args=(mailbox_address, payload),
        daemon=True,
    ).start()


def _dispatch(mailbox_address: str, payload: dict):
    private_key = os.environ.get('VAPID_PRIVATE_KEY', '')
    if not private_key:
        return

    from pywebpush import webpush, WebPushException
    from app.core.database import get_standalone_db

    db = get_standalone_db()
    try:
        row = db.execute("""
            SELECT m.notification_preview,
                   (SELECT COUNT(*) FROM messages msg
                    JOIN folders f ON msg.folder_id = f.id
                    WHERE msg.mailbox_address = m.address AND f.name='Inbox'
                    AND msg.is_read=0 AND msg.is_draft=0) AS unread_count
            FROM mailboxes m WHERE m.address=?
        """, (mailbox_address,)).fetchone()

        unread_count = row['unread_count'] if row else 0
        preview = row['notification_preview'] if row and row['notification_preview'] is not None else 1

        push_payload = {
            'message_id': payload.get('message_id'),
            'mailbox': payload.get('mailbox'),
            'unread_count': unread_count,
        }
        if preview:
            push_payload['subject'] = payload.get('subject', '')
            push_payload['from_name'] = payload.get('from_name', '')

        cur = db.execute(
            "SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE mailbox_address=?",
            (mailbox_address,),
        )
        subscriptions = list(cur.fetchall())

        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub['endpoint'],
                        "keys": {"p256dh": sub['p256dh'], "auth": sub['auth']},
                    },
                    data=json.dumps(push_payload),
                    vapid_private_key=private_key,
                    vapid_claims={"sub": "mailto:push@dockflare.local"},
                )
            except WebPushException as e:
                if e.response is not None and e.response.status_code == 410:
                    db.execute("DELETE FROM push_subscriptions WHERE id=?", (sub['id'],))
                    db.commit()
                    log.info("Removed stale push subscription for %s", mailbox_address)
                else:
                    log.warning("Push failed for %s: %s", mailbox_address, e)
    except Exception:
        log.exception("Push dispatch error for %s", mailbox_address)
    finally:
        db.close()
