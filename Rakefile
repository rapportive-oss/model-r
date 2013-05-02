
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
    require 'uglifier'
  rescue LoadError
    abort "Cannot load uglifier, is it installed?"
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

  uglified, source_map = Uglifier.new.compile_with_map(File.read("release/model-r-#{version}.js"))

  File.open("release/model-r-#{version}.min.js", 'w') do |minified|
    minified.write("/*** model-r-#{version}.min.js ***/")
    minified.write(uglified)
  end

  File.open("release/model-r-#{version}.map", 'w') {|f| f.write(source_map) }
end

task :default => :release

