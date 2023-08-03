sudo apt-get remove docker docker-engine docker.io containerd runc
sudo apt-get update
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    hostapd \
    dnsmasq

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
 sudo apt-get update
 sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose -y
sudo docker volume create portainer_data
sudo docker run -d -p 8000:8000 -p 9443:9443 --name portainer \
    --restart=always \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v portainer_data:/data \
    cr.portainer.io/portainer/portainer-ce:latest

#Prep docker folders 
sudo mkdir /var/docker
sudo chmod 0777 /var/docker

cat <<EOF > docker-compose.yml
version: '3.8'

services:
  view4all:
    image: registry.peachss.co.za/view4all_client-server:qa
    container_name: view4all_container
    environment:
      - DeviceID=v4a_fitlet-bench02
      - ParentServer=https://ver4.view4all.tv/
    volumes:
      - /var/docker/v4-server:/app/wwwroot/content
    ports:
      - "8000:8080"
EOF
docker-compose up -d

# Stop and disable the system's default DHCP and DNS services
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved

# Configure network interface
sudo ip link set wlp1s0 down
sudo ip addr flush dev wlp1s0
sudo ip addr add 192.168.0.98/24 dev wlp1s0
sudo ip link set wlp1s0 up

# Start DHCP and DNS with dnsmasq
sudo chmod 0777 /etc/dnsmasq.conf
sudo cat << EOF > /etc/dnsmasq.conf
interface=wlp1s0
dhcp-range=192.168.0.10,192.168.0.60,12h
address=/#/192.168.0.98
EOF

# Configure hostapd for the access point
sudo touch /etc/hostapd/hostapd.conf
sudo chmod 0777 /etc/hostapd/hostapd.conf
sudo cat << EOF > /etc/hostapd/hostapd.conf
interface=wlp1s0
ssid=View4All
hw_mode=g
channel=6
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
EOF

# Start hostapd and dnsmasq
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl start hostapd
sudo systemctl enable dnsmasq
sudo systemctl start dnsmasq

# Enable IP forwarding to provide internet access
sudo sysctl net.ipv4.ip_forward=1
#sudo iptables -t nat -A POSTROUTING -o <your_internet_interface> -j MASQUERADE

# Save the IP forwarding configuration
sudo sh -c "echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf"

echo "Setup complete. The Access Point with SSID 'View4All' and captive portal is now running."
