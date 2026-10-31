require 'rbconfig'

# Some Xcode installations omit the headers referenced by macOS system Ruby.
# Use matching headers from Command Line Tools when they are available.
header_dir = RbConfig::CONFIG['rubyarchhdrdir']
unless File.file?(File.join(header_dir, 'ruby', 'config.h'))
  marker = '/System/Library/Frameworks/Ruby.framework/'
  old_sdk = header_dir.split(marker, 2).first
  if header_dir.include?(marker)
    sdk = Dir.glob('/Library/Developer/CommandLineTools/SDKs/MacOSX*.sdk').sort.reverse.find do |candidate|
      File.file?(File.join(candidate, header_dir.delete_prefix(old_sdk), 'ruby', 'config.h'))
    end
    if sdk
      [RbConfig::CONFIG, RbConfig::MAKEFILE_CONFIG].each do |config|
        config.each do |key, value|
          config[key] = value.sub(old_sdk, sdk) if value.is_a?(String) && value.include?(old_sdk)
        end
      end
      ENV['SDKROOT'] = sdk
    end
  end
end
