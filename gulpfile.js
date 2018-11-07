const gulp = require('gulp');
const through = require('through2');
const path = require('path');

// Add rasperry specific packages. This allows to develop out of raspberry (for example, on Windows platform)
let processPackages = () => through.obj(function (vinylFile, encoding, callback) {
    let file = path.basename(vinylFile.path);
    if (file == 'package.json') {
        var transformedFile = vinylFile.clone();
        let release = require('./package.release.json');
        let result = JSON.parse(transformedFile.contents.toString());
        Object.assign(result.dependencies, release.dependencies);
        delete result.devDependencies;
        transformedFile.contents = new Buffer(JSON.stringify(result, null, 4));
        callback(null, transformedFile);
    } else {
        callback(null, vinylFile);    
    }
});

const copyMapping = [
    { from: './package.json', to: './dist/' },
    { from: './src/resources/**/*', to: './dist/resources/' },
    { from: './ecosystem.config.js', to: './dist/', },
    { from: './src/config.default.json', to: './dist/' },
    { from: './src/i18n/**/*', to: './dist/i18n/' }
];

gulp.task('default', () => {
    copyMapping.forEach(m => {
        gulp.src(m.from).pipe(processPackages()).pipe(gulp.dest(m.to));
    });
});

gulp.task('watch', function(){
    gulp.watch(copyMapping.map(m => m.from), ['default']);
});