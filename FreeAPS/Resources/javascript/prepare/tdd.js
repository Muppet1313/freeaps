
function generate(glucose_data, pumphistory_data, profile_data, preferences_data) {
        
        var enoughData = false;
        var pumpData = 0;
        var log = "";
        var logTDD = "";
        var logBasal = "";
        var logBolus = "";
        var logTempBasal = "";
        var current = 0;
        // If you have not set this to 0.05 in FAX settings (Omnipod), this will be set to 0.1 in code.
        var minimalDose = profile_data.bolus_increment;
        var TDD = 0;
        var insulin = 0;
        var tempInsulin = 0;
        var bolusInsulin = 0;
        var scheduledBasalInsulin = 0;
        var incrementsRaw = 0;
        var incrementsRounded = 0;
        var quota = 0;
                
        // Check that there is enough pump history data (>23 hours) for TDD calculation, else end this middleware.
        let ph_length = pumphistory_data.length;
        let endDate = new Date(pumphistory_data[ph_length-1].timestamp);
        let startDate = new Date(pumphistory_data[0].timestamp);
        // > 23 hours
        pumpData = (startDate - endDate) / 36e5;
        if (pumpData >= 23) {
            enoughData = true;
        } else {
            enoughData = false;
            TDD = 0;
            return TDD;
        }
        
        // Calculate TDD --------------------------------------
        //Bolus:
        for (let i = 0; i < pumphistory_data.length; i++) {
            if (pumphistory_data[i]._type == "Bolus") {
                bolusInsulin += pumphistory_data[i].amount;
            }
        }
        
        // Temp basals:
        if (minimalDose != 0.05) {
            minimalDose = 0.1;
        }
        for (let j = 1; j < pumphistory_data.length; j++) {
            if (pumphistory_data[j]._type == "TempBasal" && pumphistory_data[j].rate > 0) {
                current = j;
                quota = pumphistory_data[j].rate;
                var duration = pumphistory_data[j-1]['duration (min)'] / 60;
                var origDur = duration;
                var pastTime = new Date(pumphistory_data[j-1].timestamp);
                // If temp basal hasn't yet ended, use now as end date for calculation
                do {
                    j--;
                    if (j <= 0) {
                        morePresentTime =  new Date();
                        break;
                    } else if (pumphistory_data[j]._type == "TempBasal" || pumphistory_data[j]._type == "PumpSuspend") {
                            morePresentTime = new Date(pumphistory_data[j].timestamp);
                            break;
                      }
                }
                while (j >= 0);
                
                var diff = (morePresentTime - pastTime) / 36e5;
                if (diff < origDur) {
                    duration = diff;
                }
                
                insulin = quota * duration;
                    
                // Account for smallest possible pump dosage
                incrementsRaw = insulin / minimalDose;
                if (incrementsRaw >= 1) {
                    incrementsRounded = Math.floor(incrementsRaw);
                    insulin = incrementsRounded * minimalDose;
                    tempInsulin += insulin;
                } else { insulin = 0}
                j = current;
            }
        }
        //  Check and count for when basals are delivered with a scheduled basal rate or an Autotuned basal rate.
        //  1. Check for 0 temp basals with 0 min duration. This is for when ending a manual temp basal and (perhaps) continuing in open loop for a while.
        //  2. Check for temp basals that completes. This is for when disconected from link/iphone, or when in open loop.
        //  To do: need to check for more circumstances when scheduled basal rates are used.
        //
        for (let i = 0; i < pumphistory_data.length; i++) {
            // Check for 0 temp basals with 0 min duration.
            insulin = 0;
            if (pumphistory_data[i]['duration (min)'] == 0) {
                let time1 = new Date(pumphistory_data[i].timestamp);
                let time2 = time1;
                let j = i;
                do {
                    --j;
                    if (pumphistory_data[j]._type == "TempBasal" && j >= 0) {
                        time2 = new Date(pumphistory_data[j].timestamp);
                        break;
                    }
                } while (j > 0);
                // duration of current scheduled basal in h
                let basDuration = (time2 - time1) / 36e5;
                if (basDuration > 0) {
                    let hour = time1.getHours();
                    let minutes = time1.getMinutes();
                    let seconds = "00";
                    let string = "" + hour + ":" + minutes + ":" + seconds;
                    let baseTime = new Date(string);
                    let basalScheduledRate = profile_data.basalprofile[0].start;
                    for (let k = 0; k < profile_data.basalprofile.length; k++) {
                        if (profile_data.basalprofile[k].start == baseTime) {
                            basalScheduledRate = profile_data.basalprofile[k].rate;
                            insulin = basalScheduledRate * basDuration;
                            break;
                        }
                        else if (k + 1 < profile_data.basalprofile.length) {
                            if (profile_data.basalprofile[k].start < baseTime && profile_data.basalprofile[k+1].start > baseTime) {
                                basalScheduledRate = profile_data.basalprofile[k].rate;
                                insulin = basalScheduledRate * basDuration;
                                break;
                            }
                        }
                        else if (k == profile_data.basalprofile.length - 1) {
                            basalScheduledRate = profile_data.basalprofile[k].rate;
                            insulin = basalScheduledRate * basDuration;
                            break;
                        }
                    }
                    // Account for smallest possible pump dosage
                    incrementsRaw = insulin / minimalDose;
                    if (incrementsRaw >= 1) {
                        incrementsRounded = Math.floor(incrementsRaw);
                        insulin = incrementsRounded * minimalDose;
                        scheduledBasalInsulin += insulin;
                    } else { insulin = 0}
                }
            }
        }
        
        // Check for temp basals that completes
        for (let i = pumphistory_data.length -1; i > 0; i--) {
            if (pumphistory_data[i]._type == "TempBasalDuration" && pumphistory_data[i]['duration (min)'] > 0) {
                let time2Duration = pumphistory_data[i]['duration (min)'] / 60;
                let time2 = new Date(pumphistory_data[i].timestamp);;
                let time1 = time2;
                let m = i;
                do {
                    --m;
                    if (m >= 0) {
                        if (pumphistory_data[m]._type == "TempBasal" && m >= 0) {
                            // next (newer) temp basal
                            let time1 = new Date(pumphistory_data[m].timestamp);
                            break;
                        }
                    }
                } while (m > 0);
                
                // Time difference in hours
                let tempBasalTimeDifference = (time1 - time2) / 36e5;
                
                if (time2Duration < tempBasalTimeDifference) {
                    
                    let timeOfbasal = tempBasalTimeDifference - time2Duration; //
                    
                    let hour = time2.getHours();
                    let minutes = time2.getMinutes();
                    let seconds = "00";
                    let string = "" + hour + ":" + minutes + ":" + seconds;
                    let baseTime = new Date(string);
                    
                    // Default if correct basal schedule rate not found
                    let basalScheduledRate = profile_data.basalprofile[0].rate;
        
                    for (let k = 0; k < profile_data.basalprofile.length; ++k) {
                        if (profile_data.basalprofile[k].start == baseTime) {
                            basalScheduledRate = profile_data.basalprofile[k].rate;
                            break;
                        }
                        else if (k+1 < profile_data.basalprofile.length) {
                            if (profile_data.basalprofile[k].start < baseTime && profile_data.basalprofile[k+1].start > baseTime) {
                                basalScheduledRate = profile_data.basalprofile[k].rate;
                                break;
                            }
                        }
                        else if (k == (profile_data.basalprofile.length - 1)) {
                            basalScheduledRate = profile_data.basalprofile[k].rate;
                            break;
                        }
                    }
                    
                    insulin = basalScheduledRate * timeOfbasal;
                    // Account for smallest possible pump dosage
                    incrementsRaw = insulin / minimalDose;
                    if (incrementsRaw >= 1) {
                        incrementsRounded = Math.floor(incrementsRaw);
                        scheduledBasalInsulin += incrementsRounded * minimalDose;
                    } else { insulin = 0}
                }
            }
        }
        
        TDD = bolusInsulin + tempInsulin + scheduledBasalInsulin;
        logBolus = ". Bolus insulin: " + bolusInsulin.toPrecision(5) + " U";
        logTempBasal = ". Temporary basal insulin: " + tempInsulin.toPrecision(5) + " U";
        logBasal = ". Delivered scheduled basal rate insulin: " + scheduledBasalInsulin.toPrecision(5) + " U";
        logTDD = ". TDD past 24h is: " + TDD.toPrecision(5) + " U";
        // ----------------------------------------------------
        return TDD;
}
