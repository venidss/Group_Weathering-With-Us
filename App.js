import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  Switch,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator
} from "react-native";
import React from "react";

const App = () => {
  const [data, setData] = React.useState(null);
  const [city, setCity] = React.useState("Manila");
  const [inputCity, setInputCity] = React.useState("");
  const [inputLocation, setInputLocation] = React.useState("");
  const [inputDestination, setInputDestination] = React.useState("");
  const [safeRoute, setSafeRoute] = React.useState([]);
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [loading, setLoading] = React.useState(false); // New loading state
  const cloudAnim = React.useRef(new Animated.Value(0)).current;
  const scrollViewRef = React.useRef(null);

  const fetchWeatherData = (city) => {
    setLoading(true); // Start loading
    fetch(`http://api.weatherapi.com/v1/forecast.json?key=0a79fb85f113473680193826250601&q=${city}&days=7`)
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          Alert.alert("Error", "Invalid city name. Please try again.");
        } else {
          setData(data);
          checkWeatherAlerts(data);
        }
      }).catch((error) => {
        Alert.alert("Error", "Failed to fetch weather data. Please try again later.");
      }).finally(() => setLoading(false)); // Stop loading
  };

  const generateRouteCities = (start, end) => {
    const routeCities = [start, end];
    if (start === "Manila" && end === "Batangas") {
      routeCities.push("Tagaytay", "Dasmariñas");
    }
    return routeCities.join(" → ");
  };

  const fetchRouteData = async (start, end) => {
    setLoading(true); // Start loading
    const routeCities = generateRouteCities(start, end);
    const routeWeather = [];
    let unsafeConditions = false;

    for (const city of routeCities) {
      try {
        const response = await fetch(
          `http://api.weatherapi.com/v1/current.json?key=0a79fb85f113473680193826250601&q=${city}`
        );
        const data = await response.json();
        if (data.error) {
          Alert.alert("Error", `Failed to fetch weather for ${city}`);
        } else {
          const isSafe = !data.current.condition.text.toLowerCase().includes("thunderstorm") &&
                         !data.current.condition.text.toLowerCase().includes("tornado") &&
                         data.current.precip_mm <= 10;

          routeWeather.push({
            city,
            condition: data.current.condition.text,
            chanceOfRain: data.current.precip_mm > 0 ? "High" : "Low",
            isSafe,
          });

          if (!isSafe) unsafeConditions = true;
        }
      } catch (error) {
        console.error(`Error fetching weather for ${city}:`, error);
        Alert.alert("Error", "Failed to fetch route data.");
      }
    }

    setSafeRoute(routeWeather);

    if (unsafeConditions) {
      Alert.alert(
        "Travel Alert",
        "One or more locations along your route may have unsafe travel conditions. Proceed with caution or consider delaying your trip."
      );
    } else {
      Alert.alert(
        "Travel Alert",
        "Your route appears to be safe for travel. Have a good trip!"
      );
    }
    setLoading(false); // Stop loading
  };

  const checkWeatherAlerts = (data) => {
    const forecast = data.forecast.forecastday[0].hour;
    let closestRain = null;

    forecast.forEach(hour => {
      const hourTime = new Date(hour.time);
      const now = new Date();
      const hoursDifference = (hourTime - now) / (1000 * 60 * 60);

      if (hour.chance_of_rain > 0 && hoursDifference <= 12) {
        if (!closestRain || hourTime < new Date(closestRain.time)) {
          closestRain = hour;
        }
      }
    });

    if (closestRain) {
      let rainIntensity = "a light";
      if (closestRain.chance_of_rain > 50) rainIntensity = "a moderate";
      if (closestRain.chance_of_rain > 80) rainIntensity = "a heavy";

      const conditionMap = {
        "Patchy rain possible": "some rain",
        "Partly cloudy": "a few clouds",
        "Sunny": "lots of sunshine",
        "Overcast": "many clouds",
        "Clear": "clear skies",
      };

      const friendlyCondition = conditionMap[closestRain.condition.text] || closestRain.condition.text;

      Alert.alert(
        "Rain Alert",
        `There is ${rainIntensity} rain expected. Expect ${friendlyCondition}.`,
        [{ text: "OK", style: "default" }]
      );
    }
  };

  const getTravelAdvice = (condition, temp_c) => {
    if (!condition) return "Weather data unavailable. Please check again later.";

    if (condition.includes("rain") && temp_c < 0) {
      return "Travel is not advisable due to snow or freezing rain. Stay safe and postpone your trip.";
    }
    if (condition.includes("rain") && temp_c > 30) {
      return "Heavy rain expected. It's better to delay the trip to avoid hazardous conditions.";
    }
    if (condition.includes("snow") || temp_c < 0) {
      return "Snow and cold temperatures make travel risky. Dress warmly and avoid unnecessary trips.";
    }
    if (temp_c > 35) {
      return "Extreme heat is forecasted. Stay hydrated, wear sunscreen, and avoid traveling during peak heat hours.";
    }
    if (condition.includes("thunderstorm") || condition.includes("tornado")) {
      return "Severe weather warning. It’s not safe to travel in these conditions.";
    }

    if (condition.includes("rain")) {
      return "Pack an umbrella or raincoat. Drive carefully and stay updated on weather alerts.";
    }
    if (condition.includes("sunny") && temp_c > 30) {
      return "Stay hydrated and wear sunscreen. Avoid prolonged exposure to the sun.";
    }
    if (condition.includes("sunny") && temp_c < 15) {
      return "Wear a light jacket. The weather is pleasant for a trip.";
    }
    if (condition.includes("cloudy")) {
      return "Weather looks clear. Enjoy your trip!";
    }

    return "Weather looks good! Enjoy your trip.";
  };

  const handleSearch = () => {
    if (inputCity.trim() === "") {
      Alert.alert("Error", "Please enter a city name.");
    } else {
      setCity(inputCity);
    }
  };

  const handleRouteSearch = () => {
    if (!inputLocation || !inputDestination) {
      Alert.alert("Error", "Please enter both your location and destination.");
    } else {
      fetchRouteData(inputLocation, inputDestination);
    }
  };

  React.useEffect(() => {
    fetchWeatherData(city);
    Animated.loop(
      Animated.timing(cloudAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [city]);

  const { width } = Dimensions.get('window');
  const conditionFontSize = width < 350 ? 18 : 24;

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : (
        <>
          <Animated.View style={[styles.cloudContainer, { transform: [{ translateX: cloudAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }] }]}>          
            <Image source={require('./assets/cloud.png')} style={styles.cloud} />
          </Animated.View>
          <View style={styles.header}>
            <Text style={styles.headerText}>Weather & Travel Planner</Text>
            <Switch value={isDarkMode} onValueChange={() => setIsDarkMode(!isDarkMode)} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput style={styles.input} placeholder="Enter city" value={inputCity} onChangeText={setInputCity} />
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          {data && (
            <ScrollView>
              <View style={styles.weatherContainer}>
                <Text style={styles.location}>{data.location.name}, {data.location.country}</Text>
                <Text style={styles.temperature}>{data.current.temp_c}°C</Text>
                <Image style={styles.icon} source={{ uri: `http:${data.current.condition.icon}` }} />
                <Text style={[styles.condition, { fontSize: conditionFontSize }]}>{data.current.condition.text}</Text>
                <Text style={styles.details}>Humidity: {data.current.humidity}%</Text>
                <Text style={styles.details}>Wind: {data.current.wind_kph} kph {data.current.wind_dir}</Text>
                <Text style={styles.details}>Pressure: {data.current.pressure_mb} mb</Text>
              </View>

              <View style={styles.forecastContainer}>
                <Text style={styles.forecastTitle}>7-Day Forecast</Text>
                {data.forecast.forecastday.map((day, index) => (
                  <View key={index} style={styles.dailyForecast}>
                    <Text style={styles.day}>{new Date(day.date).toDateString()}</Text>
                    <Image style={styles.icon} source={{ uri: `http:${day.day.condition.icon}` }} />
                    <Text style={styles.temp}>{day.day.avgtemp_c}°C</Text>
                    <Text style={styles.condition}>{day.day.condition.text}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.forecastContainer}>
                <Text style={styles.forecastTitle}>24-Hour Forecast</Text>
                <ScrollView horizontal ref={scrollViewRef} showsHorizontalScrollIndicator={false}>
                  {data.forecast.forecastday[0].hour.map((hour, index) => (
                    <View key={index} style={styles.hourlyForecast}>
                      <Text style={styles.hour}>{new Date(hour.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                      <Image style={styles.icon} source={{ uri: `http:${hour.condition.icon}` }} />
                      <Text style={styles.temp}>{hour.temp_c}°C</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.plannerContainer}>
                <Text style={styles.plannerTitle}>Travel Planner</Text>
                <TextInput style={styles.input} placeholder="Your Location" value={inputLocation} onChangeText={setInputLocation} />
                <TextInput style={styles.input} placeholder="Destination" value={inputDestination} onChangeText={setInputDestination} />
                <TouchableOpacity style={styles.searchButton} onPress={handleRouteSearch}>
                  <Text style={styles.searchButtonText}>Find Safe Route</Text>
                </TouchableOpacity>

                {data && (
                  <Text style={styles.advice}>
                    {getTravelAdvice(data.current.condition.text, data.current.temp_c)}
                  </Text>
                )}
              </View>

              {safeRoute.length > 0 && (
                <View style={styles.routeContainer}>
                  <Text style={styles.routeTitle}>Route</Text>
                  <Text style={styles.routeText}>
                    {safeRoute.map(({ city, condition, isSafe }) => `${city} (${condition}${isSafe ? " - Safe" : " - Unsafe"})`).join(" → ")}
                  </Text>
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

//design
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  darkContainer: {
    backgroundColor: '#2c3e50',
    color: 'ffffff',
  },
  cloudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  cloud: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    marginBottom: 10,
  },
  searchButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  weatherContainer: {
    width: '100%',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
  },
  location: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  temperature: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  icon: {
    width: 50,
    height: 50,
  },
  condition: {
    fontSize: 24,
    marginBottom: 10,
  },
  details: {
    fontSize: 14,
    color: '#555',
  },
  forecastContainer: {
    width: '100%',
    marginBottom: 20,
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dailyForecast: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  day: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  temp: {
    fontSize: 16,
    marginTop: 5,
  },
  hourlyForecast: {
    width: 70,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  hour: {
    fontSize: 14,
    marginBottom: 5,
  },
  plannerContainer: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 20,
  },
  plannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  advice: {
    fontSize: 16,
    marginTop: 10,
  },
  routeContainer: {
    width: '100%',
    backgroundColor: '#fff',
	padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  routeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  routeText: {
    fontSize: 16,
  },
});

export default App;
	