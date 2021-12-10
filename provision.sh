sudo apt-get remove docker docker-engine docker.io containerd runc
sudo apt-get update
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
 sudo apt-get update
 sudo apt-get install docker-ce docker-ce-cli containerd.io
sudo docker volume create portainer_data
docker run -d -p 8000:8000 -p 9443:9443 --name portainer \
    --restart=always \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v portainer_data:/data \
    cr.portainer.io/portainer/portainer-ce:2.9.3

sudo  apt-get  install nginx -y
sudo apt install pptp-linux -y
cd /etc/ppp/peers
touch PPTP
echo "pty "pptp Your_Server_IP --nolaunchpppd --debug" \
name Your_Username \
password Your_Password \
remotename PPTP  \
require-mppe-128 \
require-mschap-v2 \
refuse-eap \
refuse-pap \
refuse-chap \
refuse-mschap \
noauth \
debug \
persist \
maxfail 0  \
defaultroute" > PPTP



sudo ufw allow 80
sudo ufw allow 443
sudo apt install letsencrypt
apt install python3-certbot-nginx  -y
