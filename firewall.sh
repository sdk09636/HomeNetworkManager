iptables -t nat -A PREROUTING -p udp --dport 53 -j REDIRECT --to-ports 53
iptables -t nat -A PREROUTING -p tcp --dport 53 -j REDIRECT --to-ports 53

iptables-save > /etc/sysconfig/iptables

sudo systemctl restart iptables
sudo systemctl enable iptables
