import Foundation

struct NightscoutStatus: JSON {
    let device: String
    let openaps: OpenAPSStatus
    let pump: NSPumpStatus
    let preferences: Preferences
    let uploader: Uploader
}

struct OpenAPSStatus: JSON {
    let iob: IOBEntry?
    let suggested: Suggestion?
    let enacted: Suggestion?
    let version: String
}

struct NSPumpStatus: JSON {
    let clock: Date
    let battery: Battery?
    let reservoir: Decimal?
    let status: PumpStatus?
}

struct Uploader: JSON {
    let batteryVoltage: Decimal?
    let battery: Int
}

struct NightscoutTimevalue: JSON {
    // rep["time"] = String(format:"%02i:%02i", Int(hours), Int(minutes))
    // rep["value"] = value
    //  rep["timeAsSeconds"] = Int(offset)
    let time: String
    let value: Decimal
    let timeAsSeconds: Int
}

struct ScheduledNightscoutProfile: JSON {
    let dia: Decimal
    let carbs_hr: Decimal
    let delay: Decimal
    let timezone: String
    let target_low: [NightscoutTimevalue]
    let target_high: [NightscoutTimevalue]
    let sens: [NightscoutTimevalue]
    let basal: [NightscoutTimevalue]
    let carbratio: [NightscoutTimevalue]
    let units: String
}

struct NightscoutProfileStore: JSON {
    let defaultProfile: String
    let startDate: Date
    let mills: Int
    let units: String
    let enteredBy: String
    let store: [String: ScheduledNightscoutProfile]
}
