$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Add-Type -AssemblyName System.Drawing

$size = 128
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAlias'
$g.PixelOffsetMode = 'HighQuality'

function New-RoundedRect($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# background: teal -> deep slate gradient
$bgRect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $bgRect,
  ([System.Drawing.Color]::FromArgb(13, 148, 136)),   # teal-600
  ([System.Drawing.Color]::FromArgb(15, 23, 42)),     # slate-900
  45
$g.FillRectangle($bgBrush, $bgRect)
$bgBrush.Dispose()

# smooth top highlight
$hlRect = New-Object System.Drawing.Rectangle 0, 0, $size, 56
$hl = New-Object System.Drawing.Drawing2D.LinearGradientBrush $hlRect,
  ([System.Drawing.Color]::FromArgb(70, 255, 255, 255)),
  ([System.Drawing.Color]::FromArgb(0, 255, 255, 255)),
  90
$g.FillRectangle($hl, $hlRect)
$hl.Dispose()

# big ".map"
$fontBig = New-Object System.Drawing.Font('Consolas', 34, [System.Drawing.FontStyle]::Bold)
$fmt = New-Object System.Drawing.StringFormat
$fmt.Alignment = 'Center'; $fmt.LineAlignment = 'Center'
$shadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(90, 0, 0, 0))
$g.DrawString('.map', $fontBig, $shadow, (New-Object System.Drawing.RectangleF 2, 16, $size, 64), $fmt)
$g.DrawString('.map', $fontBig, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 14, $size, 64), $fmt)
$shadow.Dispose()

# memory map bars
$bars = @(
  @{ x = 14; w = 44; c = [System.Drawing.Color]::FromArgb(94, 234, 212) },
  @{ x = 62; w = 32; c = [System.Drawing.Color]::FromArgb(147, 197, 253) },
  @{ x = 98; w = 16; c = [System.Drawing.Color]::FromArgb(253, 186, 116) }
)
foreach ($b in $bars) {
  $path = New-RoundedRect $b.x 92 $b.w 16 4
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(45, 255, 255, 255))
  $g.FillPath($brush, $path); $brush.Dispose()
  $pen = New-Object System.Drawing.Pen $b.c, 2
  $g.DrawPath($pen, $path); $pen.Dispose()
  $path.Dispose()
}

$bmp.Save((Join-Path $root 'icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $fontBig.Dispose(); $fmt.Dispose()
Get-Item (Join-Path $root 'icon.png') | Select-Object Name, Length
