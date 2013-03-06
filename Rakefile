
begin
  require 'jasmine'
  load 'jasmine/tasks/jasmine.rake'
rescue LoadError
  task :jasmine do
    abort "Jasmine is not available. In order to run jasmine, you must: (sudo) gem install jasmine"
  end
end

task :release do
  begin
    require 'jsmin'
  rescue LoadError
    abort "jsmin is not available. In order to run rake release you must: gem install jsmin"
  end
  version = `git describe --tags --always --dirty`.sub('v', '').tr('-','.').chomp
  puts "Writing: release/model-r-#{version}.js"
  File.open("release/model-r-#{version}.js", 'w') do |output|
    output.puts "/*** model-r-#{version}.js ***/"
    Dir["js/lib/[a-z]*.js"].sort.each do |file|
      output << File.read(file)
    end
  end
  puts "Writing: release/model-r-#{version}.min.js"

  File.open("release/model-r-#{version}.min.js", 'w') do |minified|
    minified.write("/*** model-r-#{version}.min.js ***/")
    minified.write(JSMin.minify(File.read("release/model-r-#{version}.js")))
  end
end

task :default => :release

