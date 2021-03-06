var gulp = require('gulp');
var uglify = require('gulp-uglify');
var deleteFiles = require('del');
var sass = require('gulp-sass');
var filelog = require('gulp-filelog');
var include = require('gulp-include');
var jasmine = require('gulp-jasmine-phantom');
var sourcemaps = require('gulp-sourcemaps');
var svg2png = require('gulp-svg2png');
var bless = require('gulp-bless');
var autoprefixer = require('gulp-autoprefixer');
var rename = require('gulp-rename');
var runSequence = require('run-sequence');
var plugins = require('gulp-load-plugins')();

// Paths
var environment;
var repoRoot = __dirname + '/';
var bowerRoot = repoRoot + 'bower_components';
var npmRoot = repoRoot + 'node_modules';
var govukToolkitRoot = npmRoot + '/govuk_frontend_toolkit';
var dmToolkitRoot = bowerRoot + '/digitalmarketplace-frontend-toolkit/toolkit';
var sspContentRoot = bowerRoot + '/digitalmarketplace-frameworks';
var assetsFolder = repoRoot + 'app/assets';
var staticFolder = repoRoot + 'app/static';
var govukTemplateFolder = repoRoot + 'bower_components/govuk_template';
var govukTemplateAssetsFolder = govukTemplateFolder + '/assets';
var govukTemplateLayoutsFolder = govukTemplateFolder + '/views/layouts';
var paths = {
    assetsDir: assetsFolder + '/images',
    images: assetsFolder + '/images/icons/**/*.+(png|svg|jpg)',
    outputAssets: staticFolder + '/images',
};

// JavaScript paths
var jsSourceFile = assetsFolder + '/javascripts/+(application|autotrack).js';
var jsDistributionFolder = staticFolder + '/javascripts';
var jsDistributionFile = 'application.js';

// CSS paths
var cssSourceGlob = assetsFolder + '/scss/application*.scss';
var cssDistributionFolder = staticFolder + '/stylesheets';

// Configuration
var sassOptions = {
  development: {
    outputStyle: 'expanded',
    lineNumbers: true,
    includePaths: [
      assetsFolder + '/scss',
      dmToolkitRoot + '/scss',
      govukToolkitRoot + '/stylesheets',
    ],
    sourceComments: true,
    errLogToConsole: true
  },
  production: {
    outputStyle: 'compressed',
    lineNumbers: true,
    includePaths: [
      assetsFolder + '/scss',
      dmToolkitRoot + '/scss',
      govukToolkitRoot + '/stylesheets',
    ],
  },
};

var uglifyOptions = {
  development: {
    mangle: false,
    output: {
      beautify: true,
      semicolons: true,
      comments: true,
      indent_level: 2
    },
    compress: false
  },
  production: {
    mangle: true
  }
};

var logErrorAndExit = function logErrorAndExit(err) {

  // coloured text: https://coderwall.com/p/yphywg/printing-colorful-text-in-terminal-when-run-node-js-script
  console.log('\x1b[41m\x1b[37m  Error: ' + err.message + '\x1b[0m');
  process.exit(1);

};

gulp.task('clean', function (cb) {
  var fileTypes = [];
  var complete = function (fileType) {
    fileTypes.push(fileType);
    if (fileTypes.length == 2) {
      cb();
    }
  };
  var logOutputFor = function (fileType) {
    return function (err, paths) {
      if (paths !== undefined) {
        console.log('💥  Deleted the following ' + fileType + ' files:\n', paths.join('\n'));
      }
      complete(fileType);
    };
  };

  deleteFiles(jsDistributionFolder + '/**/*', logOutputFor('JavaScript'));
  deleteFiles(cssDistributionFolder + '/**/*', logOutputFor('CSS'));
});

gulp.task('sass', function () {
  var stream = gulp.src(cssSourceGlob)
    .pipe(filelog('Compressing SCSS files'))
    .pipe(
      sass(sassOptions[environment]))
        .on('error', logErrorAndExit)
    .pipe(autoprefixer({
        autoprefixer: {
          browsers: ['last 2 versions', 'ie 8-10']
        }
    }))
    .pipe(gulp.dest(cssDistributionFolder));

  stream.on('end', function () {
    console.log('💾  Compressed CSS saved as .css files in ' + cssDistributionFolder);
  });

  return stream;
});

gulp.task('sass:livereload', function () {
  var stream = gulp.src(cssSourceGlob)
    .pipe(filelog('Compressing SCSS files'))
    .pipe(
      sass(sassOptions[environment]))
        .on('error', logErrorAndExit)
    .pipe(autoprefixer({
        autoprefixer: {
          browsers: ['last 2 versions', 'ie 8-10']
        }
    }))
    .pipe(gulp.dest(cssDistributionFolder))
    .pipe(plugins.livereload());

  stream.on('end', function () {
    console.log('💾  Compressed CSS saved as .css files in ' + cssDistributionFolder);
  });

  return stream;
});

gulp.task('split', ['sass'], function(cb) {
  var stream = gulp.src(cssDistributionFolder + '/application-ie8.css')
      .pipe(filelog('Splitting CSS files'))
      .pipe(bless({
        imports: false
      }))
      .pipe(gulp.dest(cssDistributionFolder))
      .pipe(rename(function(path) {
        path.basename = path.basename.replace('blessed', 'part');
      }));

  stream.on('end', function() {
    console.log('💾  Split CSS saved as .css files in ' + cssDistributionFolder);
  });
  cb();
});

gulp.task('rename-1', function() {
  var fileTypes = [];
  var complete = function (fileType) {
    fileTypes.push(fileType);
    if (fileTypes.length == 2) {
      cb();
    }
  };
  var logOutputFor = function (fileType) {
    return function (err, paths) {
      if (paths !== undefined) {
        console.log('💥  Deleted the following ' + fileType + ' files:\n', paths.join('\n'));
      }
      complete(fileType);
    };
  };

  var stream = gulp.src(cssDistributionFolder + '/application-ie8-blessed*')
      .pipe(filelog('Renaming IE files 1'))
      .pipe(rename(function(path) {
        path.basename = ("application-ie8-part-1");
      }))
      .pipe(gulp.dest(cssDistributionFolder));

  deleteFiles(cssDistributionFolder + '/application-ie8-blessed1.css', logOutputFor('CSS'));

  stream.on('end', function() {
    console.log('💾  Rename IE CSS saved as .css files in ' + cssDistributionFolder);
  });
});

gulp.task('rename-2', function() {
  var fileTypes = [];
  var complete = function (fileType) {
    fileTypes.push(fileType);
    if (fileTypes.length == 2) {
      cb();
    }
  };
  var logOutputFor = function (fileType) {
    return function (err, paths) {
      if (paths !== undefined) {
        console.log('💥  Deleted the following ' + fileType + ' files:\n', paths.join('\n'));
      }
      complete(fileType);
    };
  };

  var stream = gulp.src(cssDistributionFolder + '/application-ie8.css')
      .pipe(filelog('Renaming IE files 2'))
      .pipe(rename(function(path) {
        path.basename += ("-part-2");
      }))
      .pipe(gulp.dest(cssDistributionFolder));

  deleteFiles(cssDistributionFolder + '/application-ie8.css', logOutputFor('CSS'));

  stream.on('end', function() {
    console.log('💾  Rename IE CSS saved as .css files in ' + cssDistributionFolder);
  });
});

gulp.task('js', function () {
  var stream = gulp.src(jsSourceFile)
    .pipe(filelog('Compressing JavaScript files'))
    .pipe(include())
    .pipe(sourcemaps.init())
    .pipe(uglify(
      uglifyOptions[environment]
    ))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest(jsDistributionFolder));

  stream.on('end', function () {
    console.log('💾 Compressed JavaScript saved as ' + jsDistributionFolder + '/' + jsDistributionFile);
  });

  return stream;
});

gulp.task('js:livereload', function () {
  var stream = gulp.src(jsSourceFile)
    .pipe(filelog('Compressing JavaScript files'))
    .pipe(include())
    .pipe(sourcemaps.init())
    .pipe(uglify(
      uglifyOptions[environment]
    ))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest(jsDistributionFolder))
    .pipe(plugins.livereload());

  stream.on('end', function () {
    console.log('💾 Compressed JavaScript saved as ' + jsDistributionFolder + '/' + jsDistributionFile);
  });

  return stream;
});

gulp.task('html:livereload', function () {
  return gulp.src(repoRoot + 'app/templates/**/*.html')
    .pipe(plugins.livereload());

});

function copyFactory(resourceName, sourceFolder, targetFolder) {

  return function() {

    return gulp
      .src(sourceFolder + "/**/*", { base: sourceFolder })
      .pipe(gulp.dest(targetFolder))
      .on('end', function () {
        console.log('📂  Copied ' + resourceName);
      });

  };

}

gulp.task(
  'copy:template_assets:stylesheets',
  copyFactory(
    "GOV.UK template stylesheets",
    govukTemplateAssetsFolder + '/stylesheets',
    staticFolder + '/stylesheets'
  )
);

gulp.task(
  'copy:template_assets:images',
  copyFactory(
    "GOV.UK template images",
    govukTemplateAssetsFolder + '/images',
    staticFolder + '/images'
  )
);

gulp.task(
  'copy:template_assets:javascripts',
  copyFactory(
    'GOV.UK template Javascript files',
    govukTemplateAssetsFolder + '/javascripts',
    staticFolder + '/javascripts'
  )
);

gulp.task(
  'copy:dm_toolkit_assets:stylesheets',
  copyFactory(
    "stylesheets from the Digital Marketplace frontend toolkit",
    dmToolkitRoot + '/scss',
    'app/assets/scss/toolkit'
  )
);

gulp.task(
  'copy:dm_toolkit_assets:images',
  copyFactory(
    "images from the Digital Marketplace frontend toolkit",
    dmToolkitRoot + '/images',
    staticFolder + '/images'
  )
);

gulp.task(
  'copy:govuk_toolkit_assets:images',
  copyFactory(
    "images from the GOVUK frontend toolkit",
    govukToolkitRoot + '/images',
    staticFolder + '/images'
  )
);

gulp.task(
  'copy:dm_toolkit_assets:templates',
  copyFactory(
    "templates from the Digital Marketplace frontend toolkit",
    dmToolkitRoot + '/templates',
    'app/templates/toolkit'
  )
);

gulp.task(
  'copy:images',
  copyFactory(
    "image assets from app to static folder",
    assetsFolder + '/images',
    staticFolder + '/images'
  )
);

gulp.task(
  'copy:svg',
  copyFactory(
    "image assets from app to static folder",
    assetsFolder + '/svg',
    staticFolder + '/svg'
  )
);

gulp.task('ui-kit.img', function() {
  return gulp.src(paths.images)
    .pipe(gulp.dest(paths.outputAssets));
});

gulp.task('svg2png', ['ui-kit.img'], function () {
  return gulp.src(paths.assetsDir + '/icons/*.svg')
    .pipe(svg2png())
    .pipe(gulp.dest(paths.outputAssets + '/icons/'));
});

gulp.task(
  'copy:govuk_template',
  copyFactory(
    "GOV.UK template into app folder",
    govukTemplateLayoutsFolder,
    'app/templates/govuk'
  )
);

gulp.task(
  'copy:ssp_content',
  copyFactory(
    "content YAML into app folder",
    sspContentRoot, 'app/content'
  )
);

gulp.task('test', function () {
  var manifest = require(repoRoot + 'spec/javascripts/manifest.js').manifest;

  manifest.support = manifest.support.map(function (val) {
    return val.replace(/^(\.\.\/){3}/, '');
  });
  manifest.test = manifest.test.map(function (val) {
    return val.replace(/^\.\.\//, 'spec/javascripts/');
  });

  return gulp.src(manifest.test)
    .pipe(jasmine({
      'jasmine': '2.0',
      'integration': true,
      'abortOnFail': true,
      'vendor': manifest.support
    }));
});

gulp.task('watch', ['build:development'], function () {
  var jsWatcher = gulp.watch([ assetsFolder + '/**/*.js' ], ['js']);
  var cssWatcher = gulp.watch([ assetsFolder + '/**/*.scss' ], ['sass']);
  var notice = function (event) {
    console.log('File ' + event.path + ' was ' + event.type + ' running tasks...');
  };

  cssWatcher.on('change', notice);
  jsWatcher.on('change', notice);
});

gulp.task('set_environment_to_development', function (cb) {
  environment = 'development';
  cb();
});

gulp.task('set_environment_to_production', function (cb) {
  environment = 'production';
  cb();
});

gulp.task(
  'copy',
  [
    'copy:ssp_content',
    'copy:template_assets:images',
    'copy:template_assets:stylesheets',
    'copy:template_assets:javascripts',
    'copy:govuk_toolkit_assets:images',
    'copy:dm_toolkit_assets:stylesheets',
    'copy:dm_toolkit_assets:images',
    'copy:dm_toolkit_assets:templates',
    'copy:images',
    'copy:svg',
    'copy:govuk_template',
    'svg2png'
  ]
);

gulp.task(
  'compile',
  [
    'copy'
  ],
  function(cb) {
    runSequence('sass',
      'split',
      'js',
      'rename-1',
      'rename-2',
      cb);
  }
);

gulp.task(
  'compile:livereload',
  [
    'copy'
  ],
  function(cb) {
    runSequence('sass:livereload',
      'split',
      'js:livereload',
      'html:livereload',
      'rename-1',
      'rename-2',
      cb);
  }
);

gulp.task('build:development', ['set_environment_to_development', 'clean'], function () {
  gulp.start('compile');
});

gulp.task('build:production', ['set_environment_to_production', 'clean'], function () {
  gulp.start('compile');
});

gulp.task('build:livereload', ['set_environment_to_development', 'clean'], function () {
  gulp.start('compile:livereload');
});

gulp.task('livereload', ['build:livereload'], function () {
  plugins.livereload.listen();
  var jsWatcher = gulp.watch([ assetsFolder + '/**/*.js' ], ['js:livereload']);
  var cssWatcher = gulp.watch([ assetsFolder + '/**/*.scss' ], ['sass:livereload']);
  var htmlWatcher = gulp.watch([ repoRoot + 'app/templates/**/*.html'], ['html:livereload']);
  var notice = function (event) {
    console.log('File ' + event.path + ' was ' + event.type + ' running tasks...');
  };

  cssWatcher.on('change', notice);
  jsWatcher.on('change', notice);
  htmlWatcher.on('change', notice);
});
