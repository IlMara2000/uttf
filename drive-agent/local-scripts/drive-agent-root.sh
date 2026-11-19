#!/bin/sh
# Avvia l'agente del drive UTTF risolvendo il volume per UUID invece che per
# nome. Il volume esterno si chiama "HIKSEMI", ma macOS lo monta in
# "/Volumes/HIKSEMI 1" quando esiste già una cartella "/Volumes/HIKSEMI": il
# percorso cambierebbe di nuovo se quella cartella sparisse o se il disco fosse
# collegato a un'altra macchina. L'UUID non cambia mai.
#
# Lo lancia il LaunchAgent com.uttf.drive-agent (KeepAlive): se il disco non è
# collegato lo script esce e launchd riprova dopo ThrottleInterval, senza
# sporcare i log con un errore al secondo.
#
# Il mount point si ricava da `diskutil list -plist external`, che legge le
# tabelle delle partizioni. `diskutil info` non si usa più: interroga l'HFS e
# su questo disco si è impiantato oltre gli 8 s, bloccando l'avvio dell'agente.
# L'inventario ha comunque un limite di 20 s, così un disco che non risponde
# fa uscire lo script invece di lasciarlo appeso.
#
# Per provare solo la risoluzione: NODE_BIN=/usr/bin/true sh drive-agent-root.sh
set -u

VOLUME_UUID=${UTTF_VOLUME_UUID:-77B5C544-2330-3790-89FA-0BEDBCC47CB5}
DRIVE_DIR=${UTTF_DRIVE_DIR:-Drive Under the Tower Factory}
AGENT_REL=${UTTF_AGENT_REL:-File Temp/CRMs/UTTF/drive-agent/agent.cjs}
NODE=${NODE_BIN:-/usr/local/bin/node}

say() { printf '%s %s\n' "$(date '+%Y-%m-%dT%H:%M:%S')" "$*"; }

# Inventario dei dischi esterni, con un limite di 20 s: l'alarm di perl
# sopravvive all'exec, quindi se diskutil non risponde e' diskutil stesso a
# ricevere il segnale. Niente sottoprocessi watchdog da terminare (sporcavano
# il log con "Terminated: 15").
if [ -x /usr/bin/perl ]; then
    inventory() {
        /usr/bin/perl -e 'alarm shift; exec @ARGV' 20 \
            /usr/sbin/diskutil list -plist external 2>/dev/null
    }
else
    inventory() {
        /usr/sbin/diskutil list -plist external 2>/dev/null
    }
fi

# MountPoint del volume con il nostro UUID: i dizionari delle partizioni sono
# piatti, con <key> e <string> su righe consecutive.
mount_point=$(inventory | awk -v uuid="$VOLUME_UUID" '
    /<dict>/ { delete value; inside = 1; next }
    /<\/dict>/ {
        if (toupper(value["VolumeUUID"]) == toupper(uuid) && value["MountPoint"] != "") {
            print value["MountPoint"]
            exit
        }
        inside = 0
        next
    }
    inside && /<key>/ {
        name = $0
        sub(/.*<key>/, "", name)
        sub(/<\/key>.*/, "", name)
        if ((getline line) > 0) {
            sub(/.*<string>/, "", line)
            sub(/<\/string>.*/, "", line)
            value[name] = line
        }
        next
    }')

if [ -z "$mount_point" ]; then
    say "volume $VOLUME_UUID non montato o inventario non disponibile, esco"
    exit 0
fi

base=${mount_point%/}
root="$base/$DRIVE_DIR"
[ -d "$root" ] || { say "cartella del drive assente: $root"; exit 1; }

agent="$mount_point/$AGENT_REL"
[ -f "$agent" ] || { say "agent.cjs assente: $agent"; exit 1; }

export DRIVE_ROOT="$root"
say "volume $VOLUME_UUID montato in $mount_point — DRIVE_ROOT=$root"
exec "$NODE" "$agent"
