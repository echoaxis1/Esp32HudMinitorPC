#pragma once

#include <Arduino.h>
#include <Wire.h>

class CH422G {
public:
    CH422G();
    bool begin(TwoWire &wire = Wire, uint8_t addr = 0x24);
    void setPin(uint8_t pinBit, bool level);
    void setBacklight(bool on);
    void resetLCD();
    void resetTouch();

private:
    TwoWire *_wire;
    uint8_t _addr;
    uint8_t _outputState;
    void writeOutput(uint8_t state);
};

extern CH422G ioExpander;
