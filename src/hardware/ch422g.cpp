#include "ch422g.h"
#include "board_config.h"

CH422G ioExpander;

CH422G::CH422G() : _wire(&Wire), _addr(CH422G_I2C_ADDR), _outputState(0xFF) {}

bool CH422G::begin(TwoWire &wire, uint8_t addr) {
    _wire = &wire;
    _addr = addr;

    // Set IO direction for CH422G (0x24: System command register 0x48 sets open-drain/push-pull outputs)
    _wire->beginTransmission(0x24);
    _wire->write(0x01); // Enable EXIO
    uint8_t error = _wire->endTransmission();

    if (error == 0) {
        // Initial state: turn on backlight, release resets
        _outputState = CH422G_EXIO_TP_RST | CH422G_EXIO_LCD_BL | CH422G_EXIO_LCD_RST | CH422G_EXIO_SD_CS;
        writeOutput(_outputState);
        return true;
    }
    return false;
}

void CH422G::writeOutput(uint8_t state) {
    _wire->beginTransmission(_addr);
    _wire->write(state);
    _wire->endTransmission();
}

void CH422G::setPin(uint8_t pinBit, bool level) {
    if (level) {
        _outputState |= pinBit;
    } else {
        _outputState &= ~pinBit;
    }
    writeOutput(_outputState);
}

void CH422G::setBacklight(bool on) {
    setPin(CH422G_EXIO_LCD_BL, on);
}

void CH422G::resetLCD() {
    setPin(CH422G_EXIO_LCD_RST, false);
    delay(20);
    setPin(CH422G_EXIO_LCD_RST, true);
    delay(50);
}

void CH422G::resetTouch() {
    setPin(CH422G_EXIO_TP_RST, false);
    delay(10);
    setPin(CH422G_EXIO_TP_RST, true);
    delay(50);
}
