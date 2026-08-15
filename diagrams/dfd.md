# Data Flow Diagrams

## Level 0 — Context Diagram

![DFD Level 0](./dfd-L0-diagram.svg)

```mermaid
flowchart LR
    hospital["Hospital"]
    donor["Donor"]
    admin["Admin"]
    system(("ForiKhoon System"))

    hospital -->|Blood request, verification actions| system
    system -->|Match notifications, analytics| hospital
    donor -->|Registration, match responses| system
    system -->|Request notifications, badges| donor
    admin -->|Verify hospitals, manage users| system
    system -->|Platform stats| admin
```

## Level 1 — Main Processes and Data Stores

![DFD Level 1](./dfd-L1-diagram.svg)

```mermaid
flowchart TB
    hospital["Hospital"]
    donor["Donor"]

    p1["1.0\nManage Requests"]
    p2["2.0\nMatch Donors"]
    p3["3.0\nTrack Responses"]
    p4["4.0\nUpdate Reliability"]

    d1[("D1: BloodRequest")]
    d2[("D2: Donor")]
    d3[("D3: Match")]
    d4[("D4: Hospital")]

    hospital -->|New request| p1
    p1 -->|Store request| d1
    p1 -->|Trigger matching| p2

    p2 -->|Read eligible donors| d2
    p2 -->|Read request details| d1
    p2 -->|Create matches| d3
    p2 -->|Notify| donor

    donor -->|Accept / decline| p3
    p3 -->|Update match status| d3
    p3 -->|Update request status| d1

    hospital -->|Mark fulfilled / no-show| p4
    p4 -->|Update commitment score| d2
    p4 -->|Update match outcome| d3
    p4 -->|Trigger re-match if needed| p2
```

## Notes

- The loop from **4.0 (Update Reliability) back into 2.0 (Match Donors)** is the escalation mechanism — a decline or no-show doesn't just update a record, it re-triggers the matching process to find a replacement donor. This is the part of the design that isn't a simple linear CRUD flow.
- Level 1 omits the AI-ranking sub-step and the 90-day eligibility / radius-tier filtering inside "2.0 Match Donors" for readability — see the sequence diagram for that level of detail.
