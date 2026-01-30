import fs from "fs";
import path from "path";

class ProcessLogger {
  private logs: string[] = [];
  private projectDir: string = "";

  setProjectDir(dir: string) {
    this.projectDir = dir;
    this.logs = []; // Reset logs for new project
    this.log(`--- Inicio de Proceso: ${new Date().toLocaleString()} ---`);
  }

  log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);
    console.log(logMessage);
  }

  error(message: string, error?: any) {
    const errorMessage = error
      ? `${message}: ${error.message || error}`
      : message;
    this.log(`ERROR: ${errorMessage}`);
  }

  save() {
    if (!this.projectDir) return;

    try {
      const logPath = path.join(this.projectDir, "log-proceso.txt");
      fs.writeFileSync(logPath, this.logs.join("\n"), "utf-8");
      console.log(`Log guardado en: ${logPath}`);
    } catch (e) {
      console.error("Error al guardar el log del proceso:", e);
    }
  }

  getLogs() {
    return this.logs;
  }
}

export const logger = new ProcessLogger();
