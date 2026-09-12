import { readFileSync, writeFileSync } from 'node:fs';
const build = process.env.BUILD_NUMBER;
if (!build || !/^[1-9]\d{0,8}$/.test(build)) throw new Error('Set BUILD_NUMBER to a unique positive integer (maximum 9 digits).');
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Expected a release version x.y.z');
const ios = 'ios/App/App.xcodeproj/project.pbxproj';
writeFileSync(ios, readFileSync(ios, 'utf8').replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${build};`).replace(/MARKETING_VERSION = [\d.]+;/g, `MARKETING_VERSION = ${version};`));
const android = 'android/app/build.gradle';
writeFileSync(android, readFileSync(android, 'utf8').replace(/versionCode \d+/, `versionCode ${build}`).replace(/versionName "[\d.]+"/, `versionName "${version}"`));
