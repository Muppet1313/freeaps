function middleware(iob, currenttemp, glucose, profile, autosens, meal, reservoir, clock, pumphistory) {
     
    
    var TDD = 0;
    var insulin = 0;
    

    for (let i = 0; i < pumphistory.length; i++) {
        if (pumphistory[i]._type == "Bolus") {
            TDD += pumphistory[i].amount;
        } else if (pumphistory[i]._type == "TempBasal" && pumphistory[i].rate > 0) {
            insulin = pumphistory[i].rate * (pumphistory[i-1]['duration (min)'] / 60);
            TDD += insulin;
        }
    }


    return  "TDD past 24h is: " + TDD.toPrecision(4) + " U";

}
