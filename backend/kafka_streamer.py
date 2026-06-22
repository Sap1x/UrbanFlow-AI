"""
UrbanFlow Command Center — Kafka Streamer Adapter (Priority 8)
Streaming infrastructure for live event ingestion.
"""
import os
import json
import logging

logger = logging.getLogger(__name__)
_use_mock = os.getenv("KAFKA_BOOTSTRAP_SERVERS") is None

def produce_event(topic: str, payload: dict):
    """
    Publish an event to the Kafka stream.
    Mocked if KAFKA_BOOTSTRAP_SERVERS is not set.
    """
    if _use_mock:
        logger.info(f"[MOCK KAFKA] Produced to {topic}: {payload.get('id', 'unknown')}")
        return
        
    try:
        from kafka import KafkaProducer
        producer = KafkaProducer(
            bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS"),
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        producer.send(topic, payload)
        producer.flush()
    except Exception as e:
        logger.error(f"Kafka produce error: {e}")

def consume_events(topic: str, callback_fn):
    """
    Consume events from the Kafka stream and fire callback.
    Mocked if KAFKA_BOOTSTRAP_SERVERS is not set.
    """
    if _use_mock:
        logger.info(f"[MOCK KAFKA] Listening to {topic}...")
        return
        
    try:
        from kafka import KafkaConsumer
        consumer = KafkaConsumer(
            topic,
            bootstrap_servers=os.getenv("KAFKA_BOOTSTRAP_SERVERS"),
            value_deserializer=lambda m: json.loads(m.decode('utf-8'))
        )
        for message in consumer:
            callback_fn(message.value)
    except Exception as e:
        logger.error(f"Kafka consume error: {e}")
