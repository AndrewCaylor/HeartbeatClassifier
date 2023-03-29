// the setup function runs once when you press reset or power the board
int analogPin = A0;
int val = 0;

void setup() {
  Serial.begin(460800);
}

// the loop function runs over and over again forever
void loop() {
  Serial.print(millis());
  Serial.print(" ");
  val = analogRead(A0);
  Serial.print(String(val));
  Serial.print("\n");
}
