const { execSync } = require('child_process');
try {
  execSync('npx tsc --noEmit --jsx react-jsx src/components/AdminFuelPage.tsx src/components/MarinaFuelView.tsx', {stdio: 'inherit'});
} catch(e) {
  process.exit(1);
}
