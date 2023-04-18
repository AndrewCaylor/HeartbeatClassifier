int analogPin = A0;
int val = 0;

// Choose 460800 baudrate
// Data will be corrupted by Ras Pi if baudrate is too high
// Higher ones seem to work fine on my Desktop for some reason
void setup() {
  Serial.begin(460800);
}

// Read analog value from A0 and print it to serial
// Print the time in milliseconds since the program started too
void loop() {
  Serial.print(millis());
  Serial.print(" ");
  val = analogRead(A0);
  Serial.print(String(val));
  Serial.print("\n");
}
