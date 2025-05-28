const MODE_TWO_WAY = 0
const MODE_FORWARD = 1
const MODE_REWIND = 2

let currentMode = MODE_TWO_WAY
let dotX: number = 2
let dotY: number = 2
let savedX: number = 0
let savedY: number = 0

let lastS1State = 0
let lastMovementTime = 0
const debounceDelay = 35

let lastKeyState = 1

pins.setPull(DigitalPin.P0, PinPullMode.PullUp)
pins.setPull(DigitalPin.P1, PinPullMode.PullUp)
pins.setPull(DigitalPin.P2, PinPullMode.PullUp)
keyboard.startKeyboardService()

led.plot(dotX, dotY)
basic.pause(500)
basic.clearScreen()
led.plot(dotX, dotY)

lastS1State = pins.digitalReadPin(DigitalPin.P0)

function showModeIndicator(): void {
    savedX = dotX
    savedY = dotY
    basic.clearScreen()
    if (currentMode == MODE_TWO_WAY) {
        led.plot(2, 2)
    } else if (currentMode == MODE_FORWARD) {
        led.plot(4, 2)
    } else {
        led.plot(0, 2)
    }
    basic.pause(400)
    basic.clearScreen()
    led.plot(savedX, savedY)
}

input.onButtonPressed(Button.A, () => {
    currentMode = MODE_REWIND
    showModeIndicator()
})

input.onButtonPressed(Button.B, () => {
    currentMode = MODE_FORWARD
    showModeIndicator()
})

input.onButtonPressed(Button.AB, () => {
    currentMode = MODE_TWO_WAY
    showModeIndicator()
    resetCursor()
})

function moveForward(): void {
    led.unplot(dotX, dotY)
    dotX = (dotX + 1) % 5
    if (dotX == 0) {
        dotY = (dotY + 1) % 5
    }
    led.plot(dotX, dotY)
    keyboard.sendString(keyboard.keys(keyboard._Key.right))
}

function moveBackward(): void {
    led.unplot(dotX, dotY)
    dotX = (dotX + 4) % 5
    if (dotX == 4) {
        dotY = (dotY + 4) % 5
    }
    led.plot(dotX, dotY)
    keyboard.sendString(keyboard.keys(keyboard._Key.left))
}

function resetCursor(): void {
    led.unplot(dotX, dotY)
    dotX = 2
    dotY = 2
    led.plot(dotX, dotY)
    keyboard.sendString(keyboard.keys(keyboard._Key.enter))
}

basic.forever(() => {
    let s1 = pins.digitalReadPin(DigitalPin.P0)
    let s2 = pins.digitalReadPin(DigitalPin.P1)
    let now = input.runningTime()
    if (s1 != lastS1State && now - lastMovementTime > debounceDelay) {
        lastMovementTime = now
        let isClockwise = (s2 != s1)
        if (isClockwise && currentMode != MODE_REWIND) {
            moveForward()
        } else if (!isClockwise && currentMode != MODE_FORWARD) {
            moveBackward()
        }
        lastS1State = s1
    }
    let keyState = pins.digitalReadPin(DigitalPin.P2)
    if (keyState == 0 && lastKeyState == 1) {
        basic.pause(30)
        if (pins.digitalReadPin(DigitalPin.P2) == 0) {
            led.unplot(dotX, dotY)
            dotX = 0
            dotY = 0
            led.plot(dotX, dotY)
            keyboard.sendString(keyboard.keys(keyboard._Key.enter))
            basic.pause(100)
            led.unplot(dotX, dotY)
            basic.pause(50)
            led.plot(dotX, dotY)
        }
    }
    lastKeyState = keyState
    basic.pause(1)
})
