let lastS1State = 0;
let s1State = 0;
let s2State = 0;
let keyState = 0;
let lastKeyState = 0;
let lastMovementTime = 0;
let debounceDelay = 5;
let dotX = 0;
let dotY = 0;
const MODE_TWO_WAY = 0;
const MODE_FORWARD = 1;
const MODE_REWIND = 2;
let currentMode = MODE_TWO_WAY;

pins.setPull(DigitalPin.P0, PinPullMode.PullUp);
pins.setPull(DigitalPin.P1, PinPullMode.PullUp);
pins.setPull(DigitalPin.P2, PinPullMode.PullUp);

keyboard.startKeyboardService()

led.plot(2, 2)
basic.pause(500)
basic.clearScreen()
led.plot(dotX, dotY)
lastS1State = pins.digitalReadPin(DigitalPin.P0);

function showModeIndicator() {
    let savedX = dotX;
    let savedY = dotY;
    basic.clearScreen()
    
    if (currentMode === MODE_TWO_WAY) {
        led.plot(2, 2)
    } else if (currentMode === MODE_FORWARD) {
        led.plot(4, 2)
    } else if (currentMode === MODE_REWIND) {
        led.plot(0, 2)
    }
    
    basic.pause(400)
    basic.clearScreen()
    led.plot(savedX, savedY)
}

input.onButtonPressed(Button.A, function() {
    currentMode = MODE_REWIND;
    showModeIndicator();
})

input.onButtonPressed(Button.B, function() {
    currentMode = MODE_FORWARD;
    showModeIndicator();
})

input.onButtonPressed(Button.AB, function() {
    currentMode = MODE_TWO_WAY;
    showModeIndicator();
})

basic.forever(function () {
    s1State = pins.digitalReadPin(DigitalPin.P0);
    s2State = pins.digitalReadPin(DigitalPin.P1);
    keyState = pins.digitalReadPin(DigitalPin.P2);
    
    if (s1State !== lastS1State && input.runningTime() - lastMovementTime > debounceDelay) {
        lastMovementTime = input.runningTime();
        let isClockwise = (s2State !== s1State);
        led.unplot(dotX, dotY);
        
        if ((isClockwise && currentMode !== MODE_REWIND) || (!isClockwise && currentMode === MODE_FORWARD)) {
            dotX++;
            if (dotX > 4) {
                dotX = 0;
                dotY++;
                if (dotY > 4) {
                    dotY = 0;
                }
            }
            keyboard.sendString(keyboard.keys(keyboard._Key.right))
        } 
        else if ((!isClockwise && currentMode !== MODE_FORWARD) || (isClockwise && currentMode === MODE_REWIND)) {
            dotX--;
            if (dotX < 0) {
                dotX = 4;
                dotY--;
                if (dotY < 0) {
                    dotY = 4;
                }
            }
            keyboard.sendString(keyboard.keys(keyboard._Key.left))
        }
        
        led.plot(dotX, dotY);
    }
    
    lastS1State = s1State;
    
    if (keyState === 0 && lastKeyState === 1) {
        led.unplot(dotX, dotY);
        dotX = 0;
        dotY = 0;
        led.plot(dotX, dotY);
        keyboard.sendString(keyboard.keys(keyboard._Key.enter))
        led.unplot(dotX, dotY);
        basic.pause(100);
        led.plot(dotX, dotY);
    }
    
    lastKeyState = keyState;
})