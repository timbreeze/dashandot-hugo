import gulp from "gulp";
import { spawn } from "child_process";
import hugoBin from "hugo-bin";
import gutil from "gulp-util";
import flatten from "gulp-flatten";
import postcss from "gulp-postcss";
import cssImport from "postcss-import";
import cssnext from "postcss-cssnext";
import BrowserSync from "browser-sync";
import webpack from "webpack";
import webpackConfig from "./webpack.conf";
import sass from "gulp-sass";
import cssNano from "gulp-cssnano";
import autoprefixer from "autoprefixer";
import mmq from "gulp-merge-media-queries";
import imagemin from "gulp-imagemin";
import sourcemaps from "gulp-sourcemaps";

const browserSync = BrowserSync.create();
// Hugo arguments
const hugoArgsDefault = ["-d", "../dist", "-s", "site", "-v"];
const hugoArgsPreview = ["--buildDrafts", "--buildFuture"];

// Development tasks
gulp.task("hugo", (cb) => buildSite(cb));
gulp.task("hugo-preview", (cb) => buildSite(cb, hugoArgsPreview));

// Run server tasks
gulp.task("server", ["hugo", "css", "js", "fonts", "img"], (cb) => runServer(cb));
gulp.task("server-preview", ["hugo-preview", "css", "js", "fonts", "img"], (cb) =>
  runServer(cb)
);

// Build/production tasks
gulp.task("build", ["css", "js", "fonts", "img"], (cb) =>
  buildSite(cb, [], "production")
);
gulp.task("build-preview", ["css", "js", "fonts", "img"], (cb) =>
  buildSite(cb, hugoArgsPreview, "production")
);

// Compile CSS with PostCSS
// gulp.task("css", () =>
//   gulp
//     .src("./src/css/*.css")
//     .pipe(postcss([cssImport({ from: "./src/css/main.css" }), cssnext()]))
//     .pipe(gulp.dest("./dist/css"))
//     .pipe(browserSync.stream())
// );

gulp.task("css", () => {
  gulp
    .src("./src/scss/*.scss")
    .pipe(sourcemaps.init())
    .pipe(
      sass({
        errLogToConsole: true,
        outputStyle: "nested",
        precision: 10,
        includePaths: ["node_modules"]
      })
    )
    .on("error", console.error.bind(console))
    .pipe(sourcemaps.write({includeContent: false}))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(postcss([autoprefixer()]))
    .pipe(sourcemaps.write("/"))
    .pipe(mmq({log: true}))
    .pipe(cssNano())
    .pipe(gulp.dest("./dist/css/"))
    .pipe(browserSync.stream());
});

// Compile Javascript
gulp.task("js", (cb) => {
  const myConfig = Object.assign({}, webpackConfig);

  webpack(myConfig, (err, stats) => {
    if (err) throw new gutil.PluginError("webpack", err);
    gutil.log(
      "[webpack]",
      stats.toString({
        colors: true,
        progress: true
      })
    );
    browserSync.reload();
    cb();
  });
});

// Compress images and svg
gulp.task("img", () => {
  gulp
    .src("./src/img/*.{png,jpg,gif,svg}")
    .pipe(
      imagemin({
        progressive: true,
        optimizationLevel: 3,
        interlaced: true,
        svgoPlugins: [{removeViewBox: false}]
      })
    )
    .pipe(flatten())
    .pipe(gulp.dest("./dist/img"))
    .pipe(browserSync.stream());
});

// Move all fonts in a flattened directory
gulp.task("fonts", () => {
  gulp
    .src("./src/fonts/**/*")
    .pipe(flatten())
    .pipe(gulp.dest("./dist/fonts"))
    .pipe(browserSync.stream());
});

// Development server with browsersync
function runServer() {
  browserSync.init({
    server: {
      baseDir: "./dist"
    }
  });
  gulp.watch("./src/img/*.{png,jpg,gif,svg}", ["img"]);
  gulp.watch("./src/js/**/*.js", ["js"]);
  gulp.watch("./src/scss/**/*.scss", ["css"]);
  gulp.watch("./src/fonts/**/*", ["fonts"]);
  gulp.watch("./site/**/*", ["hugo"]);
}

/**
 * Run hugo and build the site
 */
function buildSite(cb, options, environment = "development") {
  const args = options ? hugoArgsDefault.concat(options) : hugoArgsDefault;

  process.env.NODE_ENV = environment;

  return spawn(hugoBin, args, { stdio: "inherit" }).on("close", (code) => {
    if (code === 0) {
      browserSync.reload();
      cb();
    } else {
      browserSync.notify("Hugo build failed :(");
      cb("Hugo build failed");
    }
  });
}
