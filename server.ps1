$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:5500/")
try {
    $listener.Prefixes.Add("http://127.0.0.1:5500/")
} catch {
    # 127.0.0.1 registration fallback
}

$listener.Start()
Write-Host "=========================================="
Write-Host "LifeLens Local Server Running Successfully!"
Write-Host " -> http://localhost:5500/"
Write-Host " -> http://127.0.0.1:5500/"
Write-Host "Press Ctrl+C to stop."
Write-Host "=========================================="

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
}

$root = $PSScriptRoot

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $localPath = $request.Url.LocalPath
        if ($localPath -eq "/" -or [string]::IsNullOrWhiteSpace($localPath)) { 
            $localPath = "/index.html" 
        }

        $filePath = Join-Path $root ($localPath.TrimStart("/\").Replace("/", "\"))

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }

            $buffer = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentType = $contentType
            $response.ContentLength64 = $buffer.Length
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.StatusCode = 200
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found: $localPath")
            $response.ContentType = "text/plain"
            $response.ContentLength64 = $msg.Length
            $response.Headers.Add("Access-Control-Allow-Origin", "*")
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }

        $response.OutputStream.Close()
        Write-Host "$($request.HttpMethod) $($request.Url.LocalPath) -> $($response.StatusCode)"
    } catch {
        # Catch individual request socket disconnects without terminating the server loop
        try { if ($response) { $response.OutputStream.Close() } } catch {}
    }
}
