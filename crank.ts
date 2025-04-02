let dotX = 2;
let dotY = 2;

let lastMovementTime: number = 0;
const debounceDelay: number = 50;

let lastKeyState: number = 1;

pins.setPull(DigitalPin.P0, PinPullMode.PullUp);
pins.setPull(DigitalPin.P1, PinPullMode.PullUp);
pins.setPull(DigitalPin.P2, PinPullMode.PullUp);
keyboard.startKeyboardService()
led.plot(dotX, dotY)

pins.onPulsed(DigitalPin.P0, PulseValue.Low, function () {
    let now = input.runningTime();
    if (now - lastMovementTime > debounceDelay) {
        lastMovementTime = now;
        let dtState = pins.digitalReadPin(DigitalPin.P1);
        led.unplot(dotX, dotY);

        if (dtState == 0) { // Clockwise Example (adjust if reversed)
            dotX = (dotX + 1) % 5;
            if (dotX == 0) dotY = (dotY + 1) % 5;
            keyboard.sendString(keyboard.keys(keyboard._Key.right));
        } else { // Counter-Clockwise Example (adjust if reversed)
            dotX = (dotX - 1);
            if (dotX < 0) {
                dotX = 4;
                dotY = (dotY - 1);
                if (dotY < 0) dotY = 4;
            }
            keyboard.sendString(keyboard.keys(keyboard._Key.left));
        }
        led.plot(dotX, dotY);
    }
});

basic.forever(function () {
    let keyState = pins.digitalReadPin(DigitalPin.P2);

    if (keyState === 0 && lastKeyState === 1) {
        basic.pause(30); // Switch debounce
        keyState = pins.digitalReadPin(DigitalPin.P2);
        if (keyState === 0) {
            led.unplot(dotX, dotY);
            dotX = 0;
            dotY = 0;
            led.plot(dotX, dotY);
            keyboard.sendString(keyboard.keys(keyboard._Key.enter))
            basic.pause(100);
            led.unplot(dotX, dotY);
            basic.pause(50);
            led.plot(dotX, dotY);
        }
    }
    lastKeyState = keyState;
    basic.pause(20);
})
