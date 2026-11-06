export class Logger {
  static info(message: string): void {
    console.log(message);
  }
  static warn(message: string): void {
    console.warn(message);
  }
  static error(message: string, error?: unknown): void {
    if (error !== undefined) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }
  static success(message: string): void {
    console.log(message);
  }
}
