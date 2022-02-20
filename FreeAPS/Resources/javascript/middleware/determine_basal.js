function middleware(iob, currenttemp, glucose, profile, autosens, meal, reservoir, clock, pumphistory) {
    
    var TDD = 0;
    var logTDD = "";
    var current = 0;
    
    // Calculate TDD
    
    //Bolus:
    for (let i = 0; i < pumphistory.length; i++) {
        if (pumphistory[i]._type == "Bolus") {
            // Bolus delivered
            TDD += pumphistory[i].amount;
        }
    }

    // Temp basals:
    for (let j = 0; j < pumphistory.length; ++j) {
        if (pumphistory[j]._type == "TempBasal" && pumphistory[j].rate > 0) {
            current = j;
            var quota = pumphistory[j].rate;
            var duration = pumphistory[j-1]['duration (min)'] / 60;
            var pastTime = new Date(pumphistory[j].timestamp);
                
            do {
                --j;
            }
            while (pumphistory[j]._type !== "TempBasal");
                
            var morePresentTime = new Date(pumphistory[j].timestamp);
            var diff = (morePresentTime - pastTime) / 6e4;
            if (diff > 0 && duration > diff) {
                duration = diff;
            }
            // Calculate temp basals delivered and add to TDD
            TDD += (quota * duration);
            j = current;
        }
    }

    logTDD = "TDD past 24h is: " + TDD.toPrecision(3) + " U";
    return  logTDD;
}
