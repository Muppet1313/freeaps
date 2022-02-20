function middleware(iob, currenttemp, glucose, profile, autosens, meal, reservoir, clock, pumphistory) {
    
    var TDD = 0.0;
    var logTDD = "";
    var current = 0;
    var minimalDose = profile.bolus_increment;
    var insulin = 0.00;
    var incrementsRaw = 0.00;
    var incrementsRounded = 0.00;
    var quota = 0;
    
    // Calculate TDD
    
    //Bolus:
    for (let i = 0; i < pumphistory.length; i++) {
        if (pumphistory[i]._type == "Bolus") {
            // Bolus delivered
            TDD += pumphistory[i].amount;
        }
    }

    // Temp basals:
    for (let j = 1; j < pumphistory.length; j++) {
        if (pumphistory[j]._type == "TempBasal" && pumphistory[j].rate > 0) {
            current = j;
            quota = pumphistory[j].rate;
            var duration = pumphistory[j-1]['duration (min)'] / 60;
            var origDur = duration;
            var pastTime = new Date(pumphistory[j].timestamp);
                
            do {
                --j;
            }
            while (pumphistory[j]._type !== "TempBasal");
                
            var morePresentTime = new Date(pumphistory[j].timestamp);
            var diff = (morePresentTime - pastTime) / 6e4;
            if (origDur > diff) {
                duration = diff;
            }
            insulin = quota * duration;
            
            // Account for smallest possible pump dosage
            if (minimalDose != 0.05) {
                minimalDose = 0.1;
            }
            incrementsRaw = insulin / minimalDose;
            if (incrementsRaw >= 1) {
                incrementsRounded = Math.floor(incrementsRaw);
                insulin = incrementsRounded * minimalDose;
            } else { insulin = 0}
            
            // Add temp basal delivered to TDD
            TDD += insulin;
            j = current;
        }
    }

    logTDD = "TDD past 24h is: " + TDD.toPrecision(3) + " U";
    return  logTDD;
}
