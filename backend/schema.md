# Backend Database Schema

Data model for people, aircraft operations and parts inventory.

Source: [`backend_schema_draft.xlsx`](https://docs.google.com/spreadsheets/d/1nGp604nbzjd1llN7V1WXxKogeY4LzltIpCVq6a7BG-4/edit?gid=1237754419#gid=1237754419)
(sheets: **Employee**, **Aircraft**, **Inventory**).

Executable DDL (PostgreSQL 13+) is in [`schema.sql`](./schema.sql).

Conventions: 
- every primary key column is named `uuid`
- foreign keys are named `<entity>_uuid`
- columns not marked nullable are `NOT NULL`
- Times are stored as `timestamptz` (UTC).

## Overview

Relationships only. Attributes are in the per-domain diagrams below.

```mermaid
erDiagram
    PERSON ||--o{ PERSON_ROLE : ""
    ROLE ||--o{ PERSON_ROLE : ""
    PERSON ||--o{ PERSON_CONTACT : ""
    CONTACT ||--o{ PERSON_CONTACT : ""
    PERSON ||--o| PILOT : "may be"
    PERSON ||--o| INSPECTOR : "may be"

    PILOT ||--o{ FLIGHT_LOG : "flies"
    AIRCRAFT ||--o{ FLIGHT_LOG : "flown in"
    STATION ||--o{ FLIGHT_LOG : "departs from"
    STATION ||--o{ FLIGHT_LOG : "arrives at"
    FLIGHT_LOG ||--o{ OIL_RECORD : ""
    FLIGHT_LOG ||--o{ FUEL_RECORD : ""
    FLIGHT_LOG ||--o{ PART_HOURS : ""
    FLIGHT_LOG |o--o{ INSPECTION : "optionally tied to"
    AIRCRAFT ||--o{ INSPECTION : ""
    INSPECTOR ||--o{ INSPECTION : "performs"

    COMPONENT ||--o{ PART_INSTANCE : "has units"
    COMPONENT ||--o{ COMPONENT_MANUFACTURER : ""
    MANUFACTURER ||--o{ COMPONENT_MANUFACTURER : ""
    PART_INSTANCE ||--o{ PART_HOURS : "accrues"
    PART_INSTANCE ||--o{ PART_INSTALLATION : "history"
    AIRCRAFT |o--o{ PART_INSTANCE : "currently fitted"
    AIRCRAFT ||--o{ PART_INSTALLATION : ""
```

## People (Employee sheet)

```mermaid
erDiagram
    PERSON ||--o{ PERSON_ROLE : "has"
    ROLE ||--o{ PERSON_ROLE : "assigned via"
    PERSON ||--o{ PERSON_CONTACT : "has"
    CONTACT ||--o{ PERSON_CONTACT : "assigned via"
    PERSON ||--o| PILOT : "may be"
    PERSON ||--o| INSPECTOR : "may be"

    PERSON {
        uuid uuid PK
        text name
        text username
        enum status "available, busy, offline"
        datetime last_login
    }
    ROLE {
        uuid uuid PK
        text name
    }
    CONTACT {
        uuid uuid PK
        varchar field
        enum type "email, phone"
    }
    PERSON_ROLE {
        uuid person_uuid PK, FK
        uuid role_uuid PK, FK
    }
    PERSON_CONTACT {
        uuid person_uuid PK, FK
        uuid contact_uuid PK, FK
    }
    PILOT {
        uuid uuid PK, FK "same id as person"
        text license_no UK
        datetime expiry
    }
    INSPECTOR {
        uuid uuid PK, FK "same id as person"
        text ap_license_no UK "A&P license"
        datetime expiry
    }
```

## Flight operations (Aircraft sheet)

```mermaid
erDiagram
    AIRCRAFT ||--o{ FLIGHT_LOG : "flown in"
    PILOT ||--o{ FLIGHT_LOG : "flies"
    STATION ||--o{ FLIGHT_LOG : "departs from"
    STATION ||--o{ FLIGHT_LOG : "arrives at"
    FLIGHT_LOG ||--o{ OIL_RECORD : ""
    FLIGHT_LOG ||--o{ FUEL_RECORD : ""
    FLIGHT_LOG ||--o{ PART_HOURS : ""
    FLIGHT_LOG |o--o{ INSPECTION : "optionally tied to"
    AIRCRAFT ||--o{ INSPECTION : ""
    INSPECTOR ||--o{ INSPECTION : "performs"
    PART_INSTANCE ||--o{ PART_HOURS : "accrues"

    AIRCRAFT {
        uuid uuid PK
        text type
        text registration UK
        text alias
        text status "enum values not defined in draft"
    }
    STATION {
        uuid uuid PK
        text name
        varchar icao_code UK
        varchar iata_code UK
        text city
        text country
        numeric latitude
        numeric longitude
    }
    FLIGHT_LOG {
        uuid uuid PK
        uuid aircraft_uuid FK
        datetime block_out
        datetime wheels_off
        datetime wheels_on
        datetime block_in
        numeric flight_time "generated: wheels_on - wheels_off"
        numeric block_time "generated: block_in - block_out"
        enum block_type "chartered, scheduled, training"
        uuid station_from_uuid FK
        uuid station_to_uuid FK
        uuid pilot_uuid FK
    }
    OIL_RECORD {
        uuid uuid PK
        uuid flight_uuid FK
        enum engine_position "left, right"
        numeric arrival_qts
        numeric departure_qts
    }
    FUEL_RECORD {
        uuid uuid PK
        uuid flight_uuid FK
        enum tank "left aux, left main, right main, right aux"
        numeric arrival_in_us_gal
        numeric departure_in_us_gal
    }
    INSPECTION {
        uuid uuid PK
        enum type "pre-flight, 100 hour, post-flight, maintenance, annual"
        uuid flight_uuid FK "nullable"
        datetime date_utc
        uuid inspector_uuid FK
        uuid aircraft_uuid FK
    }
    PART_HOURS {
        uuid part_instance_uuid PK, FK
        uuid flight_uuid PK, FK
        numeric brought_fwd_min
        numeric this_flight_min
        numeric to_date_min
        numeric due_100hr_min
    }
```

## Inventory (Inventory sheet)

```mermaid
erDiagram
    COMPONENT ||--o{ PART_INSTANCE : "has units"
    COMPONENT ||--o{ COMPONENT_MANUFACTURER : ""
    MANUFACTURER ||--o{ COMPONENT_MANUFACTURER : ""
    PART_INSTANCE ||--o{ PART_INSTALLATION : "history"
    AIRCRAFT |o--o{ PART_INSTANCE : "currently fitted"
    AIRCRAFT ||--o{ PART_INSTALLATION : ""

    COMPONENT {
        uuid uuid PK
        varchar part_no UK
        text description
        enum category "airframe, engine, propeller, avionics, instrument"
        text serial_no UK "nullable"
    }
    MANUFACTURER {
        uuid uuid PK
        text name
        text location
    }
    COMPONENT_MANUFACTURER {
        uuid component_uuid PK, FK
        uuid manufacturer_uuid PK, FK
    }
    PART_INSTANCE {
        uuid uuid PK
        uuid component_uuid FK
        text serial_no "unique per component"
        enum status "installed, in-warehouse, for-repair, obsolete"
        enum aircraft_position "nullable"
        uuid aircraft_uuid FK "nullable"
        text warehouse_location "nullable"
        datetime last_updated
        datetime last_used "nullable"
    }
    PART_INSTALLATION {
        uuid uuid PK
        uuid part_instance_uuid FK
        uuid aircraft_uuid FK
        enum position
        datetime installed_at
        datetime removed_at "null while installed"
    }
```

