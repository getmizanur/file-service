# Cronjob Setup Guide

This guide explains how to set up automated deployment cronjobs for the Daily Politics CMS.

## Overview

There are two separate cronjobs for optimal cache management:

1. **10-Minute Sync** (`cronjob-sync-10min.sh`)
   - Builds static site
   - Syncs to S3 with `Cache-Control: public, max-age=600` (10 minutes)
   - Does NOT invalidate CloudFront (to avoid invalidation quota limits)

2. **Hourly CloudFront Invalidation** (`cronjob-invalidate-hourly.sh`)
   - Only invalidates CloudFront cache
   - Ensures fresh content propagates globally
   - Runs less frequently to stay within AWS free tier (1,000 invalidations/month)

## Why This Strategy?

- **S3 caching (10 min)**: Short enough to show updates quickly
- **CloudFront invalidation (hourly)**: Avoids hitting AWS invalidation limits
- **Separation of concerns**: Build/sync can run frequently without incurring invalidation costs

## Prerequisites

1. **Environment Variables** - Create or update `.env` file in project root:
   ```bash
   AWS_S3_BUCKET=your-bucket-name
   AWS_REGION=us-east-1
   AWS_PROFILE=default
   CLOUDFRONT_DISTRIBUTION_ID=E1VSD95WQ4F48Y
   ```

2. **AWS CLI** - Must be installed and configured:
   ```bash
   aws configure
   ```

3. **Node.js & npm** - Available in PATH or via nvm

## Installation

### 1. Verify Scripts are Executable

```bash
chmod +x scripts/cronjob-sync-10min.sh
chmod +x scripts/cronjob-invalidate-hourly.sh
```

### 2. Test Scripts Manually

Before setting up cronjobs, test each script:

```bash
# Test 10-minute sync (builds + syncs to S3)
./scripts/cronjob-sync-10min.sh

# Test hourly invalidation (CloudFront only)
./scripts/cronjob-invalidate-hourly.sh
```

Check the logs:
```bash
tail -f logs/sync-10min-$(date +%Y%m%d).log
tail -f logs/invalidate-hourly-$(date +%Y%m%d).log
```

### 3. Add Cronjobs

Open crontab editor:
```bash
crontab -e
```

Add these entries:

```bash
# Daily Politics CMS - 10-minute sync (build + S3 sync, no CloudFront invalidation)
*/10 * * * * /Users/mizanurrahman/Workshop/Platforms/node/18.7/backup/dailypolitics-cms/scripts/cronjob-sync-10min.sh

# Daily Politics CMS - Hourly CloudFront cache invalidation
0 * * * * /Users/mizanurrahman/Workshop/Platforms/node/18.7/backup/dailypolitics-cms/scripts/cronjob-invalidate-hourly.sh

# Optional: View cron logs (macOS)
# tail -f /var/log/system.log | grep CRON
```

**Important**: Replace the full path with your actual project path.

### 4. Verify Cronjobs are Scheduled

```bash
crontab -l
```

## Cronjob Schedule Explained

### 10-Minute Sync
```
*/10 * * * *
```
- Runs every 10 minutes
- 144 executions per day
- Keeps content fresh without constant CloudFront invalidations

### Hourly Invalidation
```
0 * * * *
```
- Runs at the top of every hour (e.g., 1:00, 2:00, 3:00...)
- 24 executions per day
- 720 invalidations per month (within AWS free tier of 1,000)

## Alternative Schedules

### More Frequent Sync (Every 5 Minutes)
```bash
*/5 * * * * /path/to/cronjob-sync-10min.sh
```

### Less Frequent Invalidation (Every 2 Hours)
```bash
0 */2 * * * /path/to/cronjob-invalidate-hourly.sh
```

### Business Hours Only (9 AM - 6 PM, Mon-Fri)
```bash
*/10 9-18 * * 1-5 /path/to/cronjob-sync-10min.sh
0 9-18 * * 1-5 /path/to/cronjob-invalidate-hourly.sh
```

## Monitoring

### View Logs

Logs are stored in the `logs/` directory:

```bash
# Recent sync logs
tail -f logs/sync-10min-$(date +%Y%m%d).log

# Recent invalidation logs
tail -f logs/invalidate-hourly-$(date +%Y%m%d).log

# All sync logs
ls -lh logs/sync-10min-*.log

# All invalidation logs
ls -lh logs/invalidate-hourly-*.log
```

### Log Rotation

Both scripts automatically clean up logs older than 30 days.

### Check Last Execution

```bash
# macOS - view cron logs
log show --predicate 'processImagePath contains "cron"' --last 1h

# Linux - view cron logs
grep CRON /var/log/syslog
```

## Troubleshooting

### Cronjob Not Running

1. **Check cron is running:**
   ```bash
   # macOS
   sudo launchctl list | grep cron

   # Linux
   sudo service cron status
   ```

2. **Full paths required:**
   - Cron runs in a minimal environment
   - Always use absolute paths in crontab
   - Scripts load nvm automatically if Node.js not in PATH

3. **Environment variables:**
   - Scripts automatically load `.env` file
   - AWS credentials should be in `~/.aws/credentials`

### AWS Permission Errors

Ensure IAM user/role has these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::*:distribution/*"
    }
  ]
}
```

### Build Failures

Check build logs:
```bash
cat logs/sync-10min-$(date +%Y%m%d).log | grep ERROR
```

Common issues:
- Out of memory (increase Node.js heap size)
- Missing dependencies (run `npm install`)
- Database connection issues (ensure CMS is running)

## Stopping Cronjobs

To temporarily disable:
```bash
crontab -e
```

Add `#` at the start of each line to comment them out:
```bash
# */10 * * * * /path/to/cronjob-sync-10min.sh
# 0 * * * * /path/to/cronjob-invalidate-hourly.sh
```

To completely remove:
```bash
crontab -r  # WARNING: Removes ALL cronjobs
```

## Cost Considerations

### AWS Costs

**S3 Sync (10 min)**
- S3 PUT requests: ~144/day = ~4,320/month
- Cost: Minimal (first 1,000 requests free, then ~$0.005 per 1,000)

**CloudFront Invalidation (hourly)**
- Invalidations: 24/day = ~720/month
- Cost: FREE (first 1,000 invalidations/month free)

**Total estimated cost:** < $1/month for typical usage

### Optimization Tips

1. **Reduce sync frequency** during low-traffic hours
2. **Batch invalidations** - current hourly schedule is efficient
3. **Use cache-control headers** - scripts already implement this

## Support

For issues or questions:
- Check logs first: `logs/sync-10min-*.log` and `logs/invalidate-hourly-*.log`
- Verify environment variables in `.env`
- Test scripts manually before troubleshooting cron
- Ensure AWS credentials are valid: `aws sts get-caller-identity`

## See Also

- [AWS S3 Sync Documentation](https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html)
- [CloudFront Invalidation Documentation](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html)
- [Crontab Guru](https://crontab.guru/) - Cron expression generator
