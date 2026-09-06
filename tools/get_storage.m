#import <Foundation/Foundation.h>
#import <stdio.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSURL *url = [NSURL fileURLWithPath:@"/"];
        NSError *error = nil;
        NSDictionary *values = [url resourceValuesForKeys:@[
            NSURLVolumeTotalCapacityKey,
            NSURLVolumeAvailableCapacityForImportantUsageKey,
            NSURLVolumeAvailableCapacityKey
        ] error:&error];

        if (values) {
            unsigned long long total = [values[NSURLVolumeTotalCapacityKey] unsignedLongLongValue];
            unsigned long long availImp = [values[NSURLVolumeAvailableCapacityForImportantUsageKey] unsignedLongLongValue];
            if (availImp == 0) {
                availImp = [values[NSURLVolumeAvailableCapacityKey] unsignedLongLongValue];
            }
            unsigned long long used = total > availImp ? (total - availImp) : 0;
            double pct = total > 0 ? ((double)used / (double)total) * 100.0 : 0.0;
            double free_gb = (double)availImp / 1000000000.0;
            double used_gb = (double)used / 1000000000.0;
            double total_gb = (double)total / 1000000000.0;

            printf("%.1f,%.1f,%.1f,%.1f\n", pct, free_gb, used_gb, total_gb);
        } else {
            printf("0,0,0,0\n");
        }
    }
    return 0;
}
