from datetime import datetime

def generate_ics_event(title: str, due_date: str):
    dt = datetime.fromisoformat(due_date)

    ics_content = f"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:{title}
DTSTART:{dt.strftime('%Y%m%dT090000')}
DTEND:{dt.strftime('%Y%m%dT100000')}
END:VEVENT
END:VCALENDAR
"""

    return ics_content.encode("utf-8")