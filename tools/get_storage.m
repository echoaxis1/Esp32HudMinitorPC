#import <Foundation/Foundation.h>
#import <stdio.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSFileManager *fm = [NSFileManager defaultManager];
        NSArray *keys = @[
            NSURLVolumeNameKey,
            NSURLVolumeTotalCapacityKey,
            NSURLVolumeAvailableCapacityForImportantUsageKey,
            NSURLVolumeAvailableCapacityKey,
            NSURLVolumeIsInternalKey,
            NSURLVolumeIsRemovableKey,
            NSURLVolumeIsEjectableKey
        ];

        NSArray *urls = [fm mountedVolumeURLsIncludingResourceValuesForKeys:keys options:NSVolumeEnumerationSkipHiddenVolumes];
        
        NSMutableArray *disks = [NSMutableArray array];
        
        for (NSURL *url in urls) {
            NSDictionary *values = [url resourceValuesForKeys:keys error:nil];
            if (!values) continue;

            NSString *name = values[NSURLVolumeNameKey] ?: @"Unknown";
            unsigned long long total = [values[NSURLVolumeTotalCapacityKey] unsignedLongLongValue];
            unsigned long long avail = [values[NSURLVolumeAvailableCapacityForImportantUsageKey] unsignedLongLongValue];
            if (avail == 0) {
                avail = [values[NSURLVolumeAvailableCapacityKey] unsignedLongLongValue];
            }
            BOOL isInternal = [values[NSURLVolumeIsInternalKey] boolValue];
            BOOL isRemovable = [values[NSURLVolumeIsRemovableKey] boolValue];
            BOOL isEjectable = [values[NSURLVolumeIsEjectableKey] boolValue];

            if (total == 0) continue;

            unsigned long long used = total > avail ? (total - avail) : 0;
            double pct = total > 0 ? (((double)used / (double)total) * 100.0) : 0.0;
            double free_gb = (double)avail / 1e9;
            double used_gb = (double)used / 1e9;
            double total_gb = (double)total / 1e9;

            NSString *path = [url path];
            NSString *typeStr = @"EXT";
            if (isInternal && [path isEqualToString:@"/"]) {
                typeStr = @"INT";
            } else if (isRemovable) {
                typeStr = @"SD/USB";
            } else if (isEjectable) {
                typeStr = @"EXT";
            } else if ([path hasPrefix:@"/Volumes/"]) {
                typeStr = @"EXT";
            }

            if ([name length] > 18) {
                name = [name substringToIndex:18];
            }

            NSDictionary *d = @{
                @"n": name,
                @"t": typeStr,
                @"u": [NSNumber numberWithDouble:round(used_gb * 10.0) / 10.0],
                @"f": [NSNumber numberWithDouble:round(free_gb * 10.0) / 10.0],
                @"tot": [NSNumber numberWithDouble:round(total_gb * 10.0) / 10.0],
                @"p": [NSNumber numberWithDouble:round(pct * 10.0) / 10.0]
            };
            
            if ([typeStr isEqualToString:@"INT"]) {
                [disks insertObject:d atIndex:0];
            } else {
                [disks addObject:d];
            }
        }
        
        NSData *jsonData = [NSJSONSerialization dataWithJSONObject:disks options:0 error:nil];
        if (jsonData) {
            NSString *jsonString = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
            printf("%s\n", [jsonString UTF8String]);
        } else {
            printf("[]\n");
        }
    }
    return 0;
}
