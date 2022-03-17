$( document ).ready(function() {

    let apiUrl = "https://blackjack.fuzz.me.uk";
    let sitControls = $('#sitControls');
    let dealControls = $('#dealControls');
    let turnControls = $('#turnControls');
    let endOfRoundControls = $('#endOfRoundControls');
    let endOfRoundMessage = $('#endOfRoundMessage');
    let sitValueField = $('#sitValueField');
    let dealOption = $('#dealOption');
    let balanceScreen = $('#balanceScreen');
    let balance = $('#balance');
    let playerScreen = $('#playerScreen');
    let dealerScreen = $('#dealerScreen');
    let gameContainer = $('#gameContainer')

    


    // hide everything besides sit controls
    function hideNonSitControls() {
       dealControls.hide();
       turnControls.hide();
       endOfRoundControls.hide();
       balance.hide();
    }

    function showSitControls() {
        sitControls.show();
    }

    function hideSitControls() {
        sitControls.hide();
    }

    function hideDealControls() {
        dealControls.hide();
    }
    function showDealControls() {
        dealControls.show();
    }

    function showTurnControls() {
        turnControls.show();
    }

    function hideTurnControls() {
        turnControls.hide();
    }

    function hideEndOfRoundControls(){
        endOfRoundControls.hide();
    }

    function showEndOfRoundControls() {
        endOfRoundControls.show();
    }

    function appendPlayerCard(rank, suite) {
        playerScreen.append(rank + suite + '<br>');
    }

    function appendDealerCard(rank, suite) {
        dealerScreen.append(rank + suite + '<br>');
    }

    function cleanPlayerAndDealerScreens(){
        playerScreen.text('');
        dealerScreen.text('');
    }

    
    function convertSuiteToSymbol(suite){
        switch (suite) {
            case "Clubs":
                return "♣";
            case "Diamonds":
                return "♢";
            case "Hearts":
                return "♡";
            case "Spades":
                return "♠";
            
        }

    }

    function setInitialBetOptions(betOptions){
        $('#dealControls select').text('');
        $.each(betOptions, function( index, value ) {
            $('#dealControls select').append(`<option>${value}</option>`);
        });
    }

    //These have to be different as bet options must differ based on the balance left
    function setBetOptionsAfterRoundPlayed(){
        $('#dealControls select').text('');
        $.each(JSON.parse(localStorage.betOptions), function( index, value ) {
            if(value <= localStorage.balance){
                $('#dealControls select').append(`<option>${value}</option>`);
            }
        });
    }

    function changeBalance(newBalance) {
        localStorage.balance = newBalance;
        balanceScreen.text(localStorage.balance);
    }


    function displayEndOfRoundMessage(won) {
        if (won > 0) {
            endOfRoundMessage.append("You have won " + won + " USD");
        } else {
            endOfRoundMessage.append("You have lost " + Math.abs(won) + " USD");
        }
    }

    function endOfRoundHandler(data, status) {
        //Clean dealer screen
        dealerScreen.text('');
    
        $.each(data.dealerCards, function( index, value ) {
            appendDealerCard(value.rank, convertSuiteToSymbol(value.suite));
        });

        hideTurnControls();
        if(data.currentBalance === 0){
            displayEndOfRoundMessage(parseInt(data.winAmount), data.currentBalance); 
            stand();
        } else {
            changeBalance(data.currentBalance);
            showEndOfRoundControls();
            displayEndOfRoundMessage(parseInt(data.winAmount), data.currentBalance);
            setBetOptionsAfterRoundPlayed();
        }
    }

    function generateStandStats(roundsPlayed, winAmount, roundsPlayedElement, winAmountElement){
        roundsPlayedElement.innerText = "Rounds played: " + roundsPlayed;
        if(winAmount > 0){
            winAmountElement.innerText = `You have won: ${winAmount} USD.`;
        } else if(winAmount < 0){
            winAmountElement.innerText = `You have lost: ${Math.abs(winAmount)} USD.`;
        } else {
            winAmountElement.innerText = `You have the same amount of USD as you had when you entered.`;
        }
        gameContainer.append(roundsPlayedElement);
        gameContainer.append(winAmountElement);
    }


    function generatePlayAtAnotherTableButton(roundsPlayed, winAmount){
        let playAtAnotherTable = document.createElement("button");
        playAtAnotherTable.innerHTML = "Play at another table";
        playAtAnotherTable.addEventListener('click', playAtAnotherTableHandler, false);
        playAtAnotherTable.winAmount = winAmount;
        playAtAnotherTable.roundsPlayed = roundsPlayed;
        gameContainer.append(playAtAnotherTable);
    }

    function playAtAnotherTableHandler(evt){
        evt.target.style.display = 'none';
        evt.target.roundsPlayed.style.display = 'none';
        evt.target.winAmount.style.display = 'none';
        cleanPlayerAndDealerScreens();
        endOfRoundMessage.text('');
        balance.hide();
        showSitControls();
    }

    function sit() {
        endOfRoundMessage.text('');
            hideSitControls();
            showDealControls();
            cleanPlayerAndDealerScreens();
            balance.show();

            //saving balance into local storage
            localStorage.balance = sitValueField.val();
            balanceScreen.text(sitValueField.val());

            $.post("https://blackjack.fuzz.me.uk/sit", {"balance": localStorage.balance}, function(data, status) {
                    //saving session id and bet options into storage
                    localStorage.blackjackSessionId = data.sessionId;
                    localStorage.betOptions = JSON.stringify(data.availableBetOptions);
                    setInitialBetOptions(data.availableBetOptions);

                
            }).
            fail(function(data) {
                //displaying error message
                playerScreen.append(JSON.parse(data.responseText).validation.body.message);
                dealControls.hide();
                balance.hide();
                sitControls.show();
            })
    }
    
    function deal() {
        hideDealControls();
        showTurnControls();
        

        $.post(`${apiUrl}/deal`, {"bet": dealOption.val(), "sessionId": localStorage.blackjackSessionId}, function(data, status) {
        
            //if round is not over
            if(data.roundEnded === false) {
                $.each(data.playerCards, function( index, value ) {
                    appendPlayerCard(value.rank, convertSuiteToSymbol(value.suite));
                });

                //dealer has only one card on DEAL stage (the other card is face down)
                appendDealerCard(data.dealerCards[0].rank, convertSuiteToSymbol(data.dealerCards[0].suite));
                
            }
            
        });
    }

    function hit() {
        $.post(`${apiUrl}/turn`, {"action": "hit","sessionId": localStorage.blackjackSessionId}, function(data, status) {
            
            appendPlayerCard(data.playerCard.rank, convertSuiteToSymbol(data.playerCard.suite));

            // If round is not over
            if(data.roundEnded === true) {
                endOfRoundHandler(data, status);
            }
            
            
        })
    }

    function stay() {            
        $.post(`${apiUrl}/turn`, {"action": "stay","sessionId": localStorage.blackjackSessionId}, function(data, status) {
            endOfRoundHandler(data, status);
        })
    }

    function playAnotherRound(){
        endOfRoundMessage.text('');
        cleanPlayerAndDealerScreens();
        hideEndOfRoundControls();
        showDealControls();
    }

    function stand() {
        let roundsPlayed = document.createElement("p");
        let winAmount = document.createElement("p");
        $.post(`${apiUrl}/stand`, {"sessionId": localStorage.blackjackSessionId}, function(data, status) {
            generateStandStats(data.roundsPlayed, data.winAmount, roundsPlayed, winAmount)
        }).done(function(){
            generatePlayAtAnotherTableButton(roundsPlayed, winAmount);
            hideEndOfRoundControls();
            hideDealControls();
        })
    }

    function startGame() {hideNonSitControls();}


    //settings button functions
    $('#sitButton').click(function() {
        sit();
    })

    $('#dealButton').click(function() {
        deal();
    })

    $('#hitButton').click(function() {
        hit();
    })

    $('#stayButton').click(function() {
        stay();
    })

    $('#playAnotherRound').click(function(){
        playAnotherRound();
    })

    $('.standButton').click(function(){
        stand();
    })

    //starting the game
    startGame();

});
