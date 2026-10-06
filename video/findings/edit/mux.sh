#!/bin/sh
# Remotion output (full-range yuvj420p, no audio) + the mixes -> X-ready files: yuv420p limited range, bt709, AAC.
# Reads out/wide.mp4, out/short.mp4 and private/video/findings/audio/mix.wav, mix_short.wav; writes into
# private/video/findings/: the full-quality file and a smaller delivery copy of each.
set -e
cd "$(dirname "$0")"
MEDIA=../../../private/video/findings
for v in wide:mix:trace-findings-16x9 short:mix_short:trace-findings-short-9x16; do
  name=${v%%:*}; rest=${v#*:}; mix=${rest%%:*}; out=$MEDIA/${rest#*:}
  ffmpeg -y -loglevel error -i "out/$name.mp4" -i "$MEDIA/audio/$mix.wav" \
    -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p \
    -vf "scale=in_range=full:out_range=tv,format=yuv420p" -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -x264-params colorprim=bt709:transfer=bt709:colormatrix=bt709:fullrange=off \
    -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest "$out.mp4"
  ffmpeg -y -loglevel error -i "$out.mp4" -c:v libx264 -preset slow -crf 23 -maxrate 12M -bufsize 24M -pix_fmt yuv420p \
    -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 160k -movflags +faststart "$out-delivery.mp4"
  echo "wrote $out.mp4 and $out-delivery.mp4"
done
