# Free always-on hosting (one Linux server)

Written for an Oracle Cloud "Always Free" Ampere A1 server running Ubuntu. Any Linux server with Docker should work.
Running since 2026-11-26 on a Google Cloud e2-micro with Debian.

## 1. Open the web ports

- Oracle console: the server's subnet, Security List, add ingress rules for TCP 80 and 443 from 0.0.0.0/0.
- Oracle's Ubuntu images also have a local firewall:

      sudo iptables -I INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT
      sudo netfilter-persistent save

## 2. Install Docker and get the code

    sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
    sudo usermod -aG docker $USER    # then log out and in again
    git clone https://github.com/thesakshamgoel/Shakeslip.git
    cd Shakeslip/deploy

## 3. Configure and start

    cp env.example .env
    nano .env                        # set DOMAIN
    docker compose up -d --build

Check `https://DOMAIN/healthz` shows `ok`. Then sign up, send a test invoice and download its PDF.

## 4. Google sign-in

Firebase console, project `shakeslip`, Authentication, Settings, Authorized domains: add DOMAIN.

## 5. Backups

    sh backup.sh
    (crontab -l 2>/dev/null; echo "30 20 * * * sh $PWD/backup.sh >> $PWD/backup.log 2>&1") | crontab -

These copies sit on the same server. Download one regularly, for example with `scp`.

Restore (replaces the live database):

    docker compose stop app
    docker compose cp backups/FILE.db app:/data/shakeslip.db
    docker compose run --rm --user root app sh -c 'rm -f /data/shakeslip.db-wal /data/shakeslip.db-shm'
    docker compose start app

## 6. Update

    cd ~/Shakeslip && git pull && cd deploy && docker compose up -d --build

## Small servers (1 GB, for example Google Cloud e2-micro)

Add 2 GB of swap, and build the image on your own computer (x86-64) instead of on the server:

    docker build --platform linux/amd64 -t shakeslip:latest <the four VITE_ build args> .
    docker save shakeslip:latest | gzip -1 | ssh USER@SERVER 'gunzip | sudo docker load'
    ssh USER@SERVER 'sudo docker tag shakeslip:latest deploy-app:latest && cd Shakeslip && git pull && cd deploy && sudo docker compose up -d --no-build'

The Oracle firewall steps in section 1 do not apply to Google Cloud: tick "Allow HTTP" and "Allow HTTPS" when creating the server.
