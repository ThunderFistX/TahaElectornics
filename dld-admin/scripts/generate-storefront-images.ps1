Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\public\storefront"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-Brush($color) {
  return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($color))
}

function Draw-RoundedRectangle($graphics, $pen, $brush, $x, $y, $w, $h, $radius) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $radius * 2
  $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
  $path.AddArc($x + $w - $diameter, $y, $diameter, $diameter, 270, 90)
  $path.AddArc($x + $w - $diameter, $y + $h - $diameter, $diameter, $diameter, 0, 90)
  $path.AddArc($x, $y + $h - $diameter, $diameter, $diameter, 90, 90)
  $path.CloseFigure()
  if ($brush) { $graphics.FillPath($brush, $path) }
  if ($pen) { $graphics.DrawPath($pen, $path) }
  $path.Dispose()
}

function Draw-PrinterScene($fileName, $bg1, $bg2, $accent, $title, $subtitle) {
  $bitmap = New-Object System.Drawing.Bitmap 1600, 720
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $rect = New-Object System.Drawing.Rectangle 0, 0, 1600, 720
  $gradient = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.ColorTranslator]::FromHtml($bg1)), ([System.Drawing.ColorTranslator]::FromHtml($bg2)), 25
  $graphics.FillRectangle($gradient, $rect)

  $white = New-Brush "#ffffff"
  $muted = New-Brush "#e5e7eb"
  $dark = New-Brush "#0f172a"
  $accentBrush = New-Brush $accent
  $soft = New-Brush "#ffffffcc"
  $shadow = New-Brush "#00000022"

  for ($i = 0; $i -lt 18; $i++) {
    $x = 80 + ($i * 91) % 1460
    $y = 70 + ($i * 53) % 590
    $graphics.FillEllipse((New-Brush "#ffffff18"), $x, $y, 14, 14)
  }

  Draw-RoundedRectangle $graphics $null $shadow 895 125 470 350 48
  Draw-RoundedRectangle $graphics $null $white 870 95 470 350 48
  Draw-RoundedRectangle $graphics $null (New-Brush "#f8fafc") 930 170 350 155 34
  Draw-RoundedRectangle $graphics $null $accentBrush 965 205 130 36 18
  Draw-RoundedRectangle $graphics $null $muted 1120 205 120 36 18
  Draw-RoundedRectangle $graphics $null (New-Brush "#111827") 990 325 250 85 30
  Draw-RoundedRectangle $graphics $null (New-Brush "#334155") 1025 360 180 22 11
  Draw-RoundedRectangle $graphics $null $soft 1035 455 165 120 12
  $graphics.FillRectangle((New-Brush "#cbd5e1"), 1060, 485, 110, 8)
  $graphics.FillRectangle((New-Brush "#cbd5e1"), 1060, 510, 80, 8)

  $fontTitle = New-Object System.Drawing.Font "Arial", 52, ([System.Drawing.FontStyle]::Bold)
  $fontSub = New-Object System.Drawing.Font "Arial", 23, ([System.Drawing.FontStyle]::Regular)
  $fontBadge = New-Object System.Drawing.Font "Arial", 18, ([System.Drawing.FontStyle]::Bold)
  Draw-RoundedRectangle $graphics $null (New-Brush "#ffffff24") 105 95 210 52 26
  $graphics.DrawString("TAHA STORE", $fontBadge, $white, 132, 108)
  $graphics.DrawString($title, $fontTitle, $white, 105, 210)
  $graphics.DrawString($subtitle, $fontSub, (New-Brush "#e2e8f0"), 110, 350)
  Draw-RoundedRectangle $graphics $null $accentBrush 110 455 185 58 29
  $graphics.DrawString("Shop now", $fontBadge, $dark, 153, 472)

  $path = Join-Path $outDir $fileName
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $fontTitle.Dispose(); $fontSub.Dispose(); $fontBadge.Dispose()
  $gradient.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}

Draw-PrinterScene "hero-printers.png" "#0f172a" "#115e59" "#34d399" "Portable Printers" "Mini printers for labels, packages, dates, and mobile selling."
Draw-PrinterScene "hero-labels.png" "#18181b" "#7f1d1d" "#fbbf24" "Labels & Cartridges" "Clean supplies for everyday business printing and packaging."
Draw-PrinterScene "hero-delivery.png" "#111827" "#1d4ed8" "#93c5fd" "Ready For Delivery" "Product details, support, and order help from one storefront."
