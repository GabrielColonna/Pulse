import Foundation

enum PulseConstants {
    static let privacyPIN = "0307"
    static let privacyGateEnabled = true
    static let maxRecurrenceCount = 36
}

enum DefaultCategoryModel {
    static let payload = CategoryModelPayload(
        income: [
            CategoryGroup(
                name: "Income",
                subcategories: [
                    CategorySubcategory(name: "Salary", keywords: ["paycheck", "salary"]),
                    CategorySubcategory(name: "Gambling", keywords: ["gamble", "casino", "fliff", "underdog", "hard rock", "prize picks", "prizepicks"]),
                    CategorySubcategory(name: "Reselling", keywords: ["resell", "marketplace", "ebay", "jersey", "stockx"]),
                    CategorySubcategory(name: "Financial Aid", keywords: ["financial aid", "grant", "scholarship", "fafsa"]),
                    CategorySubcategory(name: "Other Income", keywords: ["bonus", "refund", "reimbursement", "cashback"])
                ]
            )
        ],
        expense: [
            CategoryGroup(
                name: "Personal",
                subcategories: [
                    CategorySubcategory(name: "Entertainment / Activities", keywords: ["entertainment", "movie", "netflix", "amc", "top golf", "miami heat", "poker", "tequila", "drinks", "heat tickets"]),
                    CategorySubcategory(name: "Food", keywords: ["chipotle", "cfa", "shake shack", "mcd", "mcdonalds", "flanigans", "pubsub", "burger king", "bk", "rcg vending"]),
                    CategorySubcategory(name: "Haircut", keywords: ["haircut", "barber", "salon"]),
                    CategorySubcategory(name: "Soccer", keywords: ["soccer", "stadio", "fut5ive", "futbol", "la redonda", "ags"]),
                    CategorySubcategory(name: "Gaming", keywords: ["psn", "playstation", "gaming", "sony", "marvel rivals", "nba2k", "steam"]),
                    CategorySubcategory(name: "Shopping", keywords: ["shopping", "amazon", "clothes", "amz", "zara", "souvenir"]),
                    CategorySubcategory(name: "Other", keywords: ["other", "misc"])
                ]
            ),
            CategoryGroup(
                name: "Expenses",
                subcategories: [
                    CategorySubcategory(name: "Memberships", keywords: ["membership", "subscription", "gym", "icloud", "planet fitness", "coursera", "microsoft 365", "pf monthly", "annual fee"]),
                    CategorySubcategory(name: "Car Payments", keywords: ["car payment", "auto loan", "pay off car"]),
                    CategorySubcategory(name: "Insurance", keywords: ["insurance", "geico"]),
                    CategorySubcategory(name: "Necessities", keywords: ["doctor", "dentist", "dental", "medicine", "medication", "prescription", "pharmacy", "glasses", "contacts", "vision", "optometrist", "clinic", "hospital", "urgent care", "copay", "therapy", "health"]),
                    CategorySubcategory(name: "Groceries", keywords: ["grocery", "walmart", "costco", "aldi", "target", "publix", "trader joe", "walgreens", "xeela"]),
                    CategorySubcategory(name: "Investments", keywords: ["investment", "stock", "crypto", "savings", "wealthfront", "xrp"]),
                    CategorySubcategory(name: "Losses", keywords: ["loss", "chargeback", "parking ticket", "parking citation"])
                ]
            ),
            CategoryGroup(
                name: "Car",
                subcategories: [
                    CategorySubcategory(name: "Gas", keywords: ["gas", "fuel", "shell", "chevron"]),
                    CategorySubcategory(name: "Oil Changes", keywords: ["oil change", "tire kingdom"]),
                    CategorySubcategory(name: "Repairs", keywords: ["repair", "maintenance", "mechanic", "car tow", "tow", "brake", "registration renewal"]),
                    CategorySubcategory(name: "Tolls", keywords: ["toll", "tolls"]),
                    CategorySubcategory(name: "Parking", keywords: ["parking"]),
                    CategorySubcategory(name: "Other Car", keywords: ["registration", "dmv"])
                ]
            ),
            CategoryGroup(
                name: "Travel",
                subcategories: [
                    CategorySubcategory(name: "Hotel", keywords: ["hotel", "airbnb", "bnb", "hostel"]),
                    CategorySubcategory(name: "Flights", keywords: ["flight", "airfare", "spirit", "checked bag", "seatbid", "flight to", "san fran flights"]),
                    CategorySubcategory(name: "Transportation", keywords: ["lyft", "uber"]),
                    CategorySubcategory(name: "Activities", keywords: ["activity"])
                ]
            ),
            CategoryGroup(
                name: "Girlfriend",
                subcategories: [
                    CategorySubcategory(name: "Gifts", keywords: ["flowers", "vday", "valentines"]),
                    CategorySubcategory(name: "Dates", keywords: ["date night", "olive garden", "divieto", "north italia", "wood one ramen"]),
                    CategorySubcategory(name: "Other", keywords: ["gabby", "publix stuff"])
                ]
            )
        ]
    )

    static let legacyAliases: [String: CategoryAssignment] = [
        "PAYCHECK/SALARY": CategoryAssignment(parentCategory: "Income", category: "Salary"),
        "WEEK": CategoryAssignment(parentCategory: "Income", category: "Salary"),
        "GAM": CategoryAssignment(parentCategory: "Income", category: "Gambling"),
        "RSL": CategoryAssignment(parentCategory: "Income", category: "Reselling"),
        "FAA": CategoryAssignment(parentCategory: "Income", category: "Financial Aid"),
        "OTH": CategoryAssignment(parentCategory: "Income", category: "Other Income"),
        "MEM": CategoryAssignment(parentCategory: "Expenses", category: "Memberships"),
        "VAC": CategoryAssignment(parentCategory: "Travel", category: "Hotel"),
        "INV": CategoryAssignment(parentCategory: "Expenses", category: "Investments"),
        "LSS": CategoryAssignment(parentCategory: "Expenses", category: "Losses"),
        "GAS": CategoryAssignment(parentCategory: "Car", category: "Gas"),
        "INS": CategoryAssignment(parentCategory: "Expenses", category: "Insurance"),
        "HEALTH": CategoryAssignment(parentCategory: "Expenses", category: "Necessities"),
        "MED": CategoryAssignment(parentCategory: "Expenses", category: "Necessities"),
        "DENTAL": CategoryAssignment(parentCategory: "Expenses", category: "Necessities"),
        "OIL": CategoryAssignment(parentCategory: "Car", category: "Oil Changes"),
        "TOL": CategoryAssignment(parentCategory: "Car", category: "Tolls"),
        "PAR": CategoryAssignment(parentCategory: "Car", category: "Parking"),
        "OTH2": CategoryAssignment(parentCategory: "Car", category: "Other Car"),
        "GIFT": CategoryAssignment(parentCategory: "Girlfriend", category: "Gifts"),
        "DATE": CategoryAssignment(parentCategory: "Girlfriend", category: "Dates"),
        "OTH3": CategoryAssignment(parentCategory: "Girlfriend", category: "Other"),
        "ENT": CategoryAssignment(parentCategory: "Personal", category: "Entertainment / Activities"),
        "FOOD": CategoryAssignment(parentCategory: "Personal", category: "Food"),
        "CUT": CategoryAssignment(parentCategory: "Personal", category: "Haircut"),
        "GROC": CategoryAssignment(parentCategory: "Expenses", category: "Groceries"),
        "SOCC": CategoryAssignment(parentCategory: "Personal", category: "Soccer"),
        "PSN": CategoryAssignment(parentCategory: "Personal", category: "Gaming"),
        "SHOP": CategoryAssignment(parentCategory: "Personal", category: "Shopping"),
        "OTH4": CategoryAssignment(parentCategory: "Personal", category: "Other"),
        "CAR": CategoryAssignment(parentCategory: "Expenses", category: "Car Payments"),
        "SALARY": CategoryAssignment(parentCategory: "Income", category: "Salary"),
        "OTHER INCOME": CategoryAssignment(parentCategory: "Income", category: "Other Income"),
        "OTHER EXPENSE": CategoryAssignment(parentCategory: "Expenses", category: "Losses")
    ]
}
