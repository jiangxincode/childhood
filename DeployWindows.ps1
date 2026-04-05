$CURRENT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Definition
$TARGET_DIR = "$CURRENT_DIR/tmp"
$ARCHIVE = "$TARGET_DIR/front-end.tar.gz"
$REMOTE_DIR = "/var/www/html/front-end"

New-Item -ItemType Directory -Path $TARGET_DIR -Force | Out-Null

# Pack static files, excluding dev-only files
tar -czf $ARCHIVE -C $CURRENT_DIR --exclude="node_modules" --exclude="tmp" --exclude="package.json" --exclude="package-lock.json" --exclude="vitest.config.js" --exclude="*.test.js" --exclude=".git" --exclude="README.md" --exclude="DeployWindows.ps1" .

scp $ARCHIVE ubuntu@124.222.145.48:/tmp/front-end.tar.gz

ssh ubuntu@124.222.145.48 "rm -rf $REMOTE_DIR && mkdir -p $REMOTE_DIR && tar -xzf /tmp/front-end.tar.gz -C $REMOTE_DIR && rm /tmp/front-end.tar.gz"
