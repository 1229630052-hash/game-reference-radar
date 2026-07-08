import { spawn } from "node:child_process";

export function notifyDailyReport(report) {
  if (process.platform !== "win32") return Promise.resolve(false);
  const title = "今日游戏创意灵感日报已生成";
  const message = `${report.count} 张新的创意参考，打开 http://127.0.0.1:4188 查看。`;
  const script = `
try {
  Add-Type -AssemblyName System.Windows.Forms | Out-Null
  $n = New-Object System.Windows.Forms.NotifyIcon
  $n.Icon = [System.Drawing.SystemIcons]::Information
  $n.BalloonTipTitle = ${JSON.stringify(title)}
  $n.BalloonTipText = ${JSON.stringify(message)}
  $n.Visible = $true
  $n.ShowBalloonTip(7000)
  Start-Sleep -Seconds 8
  $n.Dispose()
} catch {
  msg * ${JSON.stringify(`${title}: ${message}`)} 2>$null
}
`;

  return new Promise((resolve) => {
    const child = spawn(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true, stdio: "ignore" },
    );
    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}
