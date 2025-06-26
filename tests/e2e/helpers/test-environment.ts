import { join } from 'path';
import { spawn } from 'child_process';

export class E2ETestHelper {
  static async runCommand(
    command: string, 
    args: string[], 
    options: { cwd?: string; env?: Record<string, string> } = {}
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: { ...process.env, ...options.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({ stdout, stderr, exitCode: code || 0 });
      });
      
      child.stdin.end();
    });
  }
  
  static getBuiltCliPath(): string {
    return join(process.cwd(), 'dist', 'index.js');
  }
}