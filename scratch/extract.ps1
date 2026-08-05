Expand-Archive -Path 'repo.zip' -DestinationPath 'temp_extract' -Force
$extractedDir = (Get-ChildItem -Path 'temp_extract')[0].FullName
Get-ChildItem -Path $extractedDir | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination '.' -Recurse -Force
}
Remove-Item -Path 'temp_extract' -Recurse -Force
Remove-Item -Path 'repo.zip' -Force
Write-Host "Extraction completed successfully."
